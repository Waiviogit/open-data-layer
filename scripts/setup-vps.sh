#!/usr/bin/env bash
# =============================================================================
# VPS bootstrap: Docker, Docker Compose plugin, Komodo + app stack from GHCR.
#
# Usage:
#   # staging
#   curl -fsSL https://raw.githubusercontent.com/Waiviogit/open-data-layer/master/scripts/setup-vps.sh | \
#     DEPLOY_ENV=staging bash
#
#   # production
#   curl -fsSL https://raw.githubusercontent.com/Waiviogit/open-data-layer/master/scripts/setup-vps.sh | \
#     DEPLOY_ENV=production bash
#
# Env overrides:
#   DEPLOY_ENV       staging | production   (default: staging)
#   REPO_URL         git repo to clone       (default: github.com/Waiviogit/open-data-layer)
#   INSTALL_DIR      where to clone          (default: /opt/open-data-layer)
#   (no GHCR login needed — images are public)
# =============================================================================
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-staging}"
REPO_URL="${REPO_URL:-https://github.com/Waiviogit/open-data-layer.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/open-data-layer}"
COMPOSE_INFRA_FILE="docker-compose.${DEPLOY_ENV}.infra.yml"
COMPOSE_APPS_FILE="docker-compose.${DEPLOY_ENV}.apps.yml"

# ── colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ── validate env ──────────────────────────────────────────────────────────────
[[ "$DEPLOY_ENV" == "staging" || "$DEPLOY_ENV" == "production" ]] || \
  error "DEPLOY_ENV must be 'staging' or 'production', got: $DEPLOY_ENV"

info "Deploy target: ${DEPLOY_ENV}"

# ── require root ──────────────────────────────────────────────────────────────
[[ "$EUID" -eq 0 ]] || error "Run as root (sudo bash or pipe to root shell)"

# ── 1. Install Docker ─────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  info "Docker already installed: $(docker --version)"
else
  info "Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg openssl

  # Detect distro from /etc/os-release (supports Ubuntu and Debian)
  . /etc/os-release
  case "$ID" in
    ubuntu|debian) DOCKER_DISTRO="$ID" ;;
    *) error "Unsupported distro: $ID. Supported: ubuntu, debian." ;;
  esac
  info "Detected distro: $DOCKER_DISTRO $VERSION_CODENAME"

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${DOCKER_DISTRO}/gpg" \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/${DOCKER_DISTRO} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
  info "Docker installed: $(docker --version)"
fi

command -v openssl &>/dev/null || apt-get install -y -qq openssl

# ── 2. Install git (usually present, but ensure) ──────────────────────────────
command -v git &>/dev/null || apt-get install -y -qq git

# ── 3. Clone or update repo ───────────────────────────────────────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Repo already cloned — pulling latest..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning repo to $INSTALL_DIR..."
  git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── 4. Create .env if missing ─────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info "Creating .env from .env.example — edit secrets before proceeding!"
  cp .env.example .env
  warn "============================================================"
  warn " ACTION REQUIRED: edit $INSTALL_DIR/.env"
  warn "  - Set DOMAIN                your real domain (e.g. example.com)"
  warn "  - Set CERTBOT_EMAIL         valid email for Let's Encrypt"
  warn "  - Set a strong JWT_SECRET   (min 16 chars)"
  warn "  - Set POSTGRES_PASSWORD"
  warn "  - Set AUTH_JWT_SECRET       (same as JWT_SECRET or separate)"
  warn "  - Set INSTALL_DIR if not using default: $INSTALL_DIR"
  warn ""
  warn "  chain-indexer start blocks (defaults used if not set):"
  warn "  - START_BLOCK_NUMBER        Hive parser start block (default: 102138605)"
  warn "  - HIVE_ENGINE_START_BLOCK   Hive Engine parser start block (default: 59083591)"
  warn "  Tip: set both to a recent block number on a fresh VPS to skip"
  warn "  historical data and start syncing from the current chain head."
  warn ""
  warn " On first start, certbot will request an SSL cert automatically."
  warn "============================================================"
  read -r -p "Press ENTER when .env is ready (or Ctrl+C to abort)..."
fi

# Ensure INSTALL_DIR / backups path for Komodo + compose interpolation
if ! grep -qE '^INSTALL_DIR=' .env; then
  echo "INSTALL_DIR=${INSTALL_DIR}" >> .env
fi
if ! grep -qE '^COMPOSE_KOMODO_BACKUPS_PATH=' .env; then
  echo "COMPOSE_KOMODO_BACKUPS_PATH=${INSTALL_DIR}/komodo-backups" >> .env
fi

# ── 4b. Nginx HTTPS vhost from template (idempotent; NEVER remove the template)
command -v envsubst &>/dev/null || apt-get install -y -qq gettext-base
DOMAIN_VAL="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '[:space:]')"
CERTBOT_EMAIL_VAL="$(grep -E '^CERTBOT_EMAIL=' .env | cut -d= -f2- | tr -d '[:space:]')"
if [[ -z "$DOMAIN_VAL" ]]; then
  error "DOMAIN is not set in .env. Edit $INSTALL_DIR/.env and re-run."
fi
if [[ -z "$CERTBOT_EMAIL_VAL" ]]; then
  error "CERTBOT_EMAIL is not set in .env (required for Let's Encrypt). Edit $INSTALL_DIR/.env and re-run."
fi

NGINX_TEMPLATE="nginx/conf.d/default.conf.template"
NGINX_OUT="nginx/conf.d/default.conf"
if [[ ! -f "$NGINX_TEMPLATE" ]]; then
  error "Missing $INSTALL_DIR/$NGINX_TEMPLATE — run: git pull $INSTALL_DIR (template must stay in the repo)."
fi

info "Writing $NGINX_OUT from template for DOMAIN=$DOMAIN_VAL..."
export DOMAIN="$DOMAIN_VAL"
umask 022
envsubst '${DOMAIN}' < "$NGINX_TEMPLATE" > "${NGINX_OUT}.tmp"
mv "${NGINX_OUT}.tmp" "$NGINX_OUT"

# Stale file left when cert was missing / DOMAIN was wrong — confuses jonasal/nginx-certbot
if [[ -f nginx/conf.d/default.conf.nokey ]]; then
  rm -f nginx/conf.d/default.conf.nokey
  info "Removed stale nginx/conf.d/default.conf.nokey"
fi

if ! grep -qE "/etc/letsencrypt/live/${DOMAIN_VAL}/" "$NGINX_OUT"; then
  error "Generated $NGINX_OUT does not contain expected cert paths for $DOMAIN_VAL — check $NGINX_TEMPLATE and envsubst."
fi
info "nginx TLS vhost ready (cert path: /etc/letsencrypt/live/${DOMAIN_VAL}/)."

# ── 4c. Komodo compose.env (secrets + KOMODO_HOST) ───────────────────────────
BACKUPS_PATH="${INSTALL_DIR}/komodo-backups"
mkdir -p "$BACKUPS_PATH"

if [[ ! -f compose.env ]]; then
  info "Creating compose.env for Komodo from compose.env.example..."
  if [[ ! -f compose.env.example ]]; then
    error "compose.env.example not found in $INSTALL_DIR"
  fi
  KOMODO_DB_PASS="$(openssl rand -hex 16)"
  KOMODO_ADMIN_PASS="$(openssl rand -hex 16)"
  KOMODO_JWT="$(openssl rand -hex 32)"
  KOMODO_WEBHOOK="$(openssl rand -hex 32)"
  sed \
    -e "s|^KOMODO_HOST=.*|KOMODO_HOST=http://127.0.0.1:9120|" \
    -e "s|^KOMODO_DATABASE_PASSWORD=.*|KOMODO_DATABASE_PASSWORD=${KOMODO_DB_PASS}|" \
    -e "s|^KOMODO_INIT_ADMIN_PASSWORD=.*|KOMODO_INIT_ADMIN_PASSWORD=${KOMODO_ADMIN_PASS}|" \
    -e "s|^KOMODO_JWT_SECRET=.*|KOMODO_JWT_SECRET=${KOMODO_JWT}|" \
    -e "s|^KOMODO_WEBHOOK_SECRET=.*|KOMODO_WEBHOOK_SECRET=${KOMODO_WEBHOOK}|" \
    -e "s|^COMPOSE_KOMODO_BACKUPS_PATH=.*|COMPOSE_KOMODO_BACKUPS_PATH=${BACKUPS_PATH}|" \
    -e "s|^PERIPHERY_ROOT_DIRECTORY=.*|PERIPHERY_ROOT_DIRECTORY=${INSTALL_DIR}|" \
    compose.env.example > compose.env
  chmod 600 compose.env
  info "compose.env created. Save KOMODO_INIT_ADMIN_USERNAME / password from compose.env if you need them (also in Komodo UI at first login)."
  unset KOMODO_DB_PASS KOMODO_ADMIN_PASS KOMODO_JWT KOMODO_WEBHOOK
fi

# Keep Komodo UI URL stable (localhost-only; not exposed via nginx)
if [[ -f compose.env ]] && grep -qE '^KOMODO_HOST=' compose.env; then
  sed -i "s|^KOMODO_HOST=.*|KOMODO_HOST=http://127.0.0.1:9120|" compose.env
  info "Synced KOMODO_HOST in compose.env to http://127.0.0.1:9120"
fi

[[ -f compose.env ]] || error "compose.env is missing — ensure compose.env.example exists and re-run from a clean state (see docs/deployment/komodo.md)."

# ── 5. Shared Docker network ─────────────────────────────────────────────────
info "Ensuring Docker network opden-data-layer-net exists..."
docker network create opden-data-layer-net 2>/dev/null || true

# ── 6. Pull images ────────────────────────────────────────────────────────────
info "Pulling infra images (${DEPLOY_ENV})..."
docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" pull

info "Pulling app images (${DEPLOY_ENV})..."
docker compose -p apps --env-file .env -f "$COMPOSE_APPS_FILE" pull

# ── 7. Start Postgres / Redis / IPFS, migrate, then apps, then full infra ───
info "Starting Postgres, Redis, IPFS (infra)..."
docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" up -d postgres redis ipfs

info "Waiting for Postgres to be ready..."
for _ in $(seq 1 30); do
  docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" exec -T postgres \
    pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DATABASE:-odl}" \
    &>/dev/null && break
  sleep 2
done
docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" exec -T postgres \
  pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DATABASE:-odl}" \
  || error "Postgres did not become ready in time."

info "Running database migrations..."
docker compose -p apps --env-file .env -f "$COMPOSE_APPS_FILE" --profile tools run --rm migrator
info "Migrations complete."

info "Starting application stack (project apps)..."
docker compose -p apps --env-file .env -f "$COMPOSE_APPS_FILE" up -d --remove-orphans

info "Starting Komodo + nginx (infra remainder)..."
docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" up -d --remove-orphans

# jonasal/nginx-certbot must see the new default.conf + DOMAIN/CERTBOT_EMAIL env; recreate always after setup
info "Recreating nginx container to load TLS vhost + certbot (safe on first run and re-runs)..."
docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" up -d --no-deps --force-recreate nginx

wait_certbot_attempts=0
info "Waiting up to ~5 min for Let's Encrypt (see nginx logs if this times out)..."
until [[ $wait_certbot_attempts -ge 60 ]]; do
  if docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" exec -T nginx \
    test -s "/etc/letsencrypt/live/${DOMAIN_VAL}/fullchain.pem" 2>/dev/null; then
    info "Certificate present: /etc/letsencrypt/live/${DOMAIN_VAL}/fullchain.pem"
    break
  fi
  wait_certbot_attempts=$((wait_certbot_attempts + 1))
  sleep 5
done
if [[ $wait_certbot_attempts -ge 60 ]]; then
  warn "Certificate not detected after ~5 min — DNS A/AAAA must point here; port 80 open. Logs —"
  warn "  docker compose -p infra --env-file .env --env-file compose.env -f $INSTALL_DIR/$COMPOSE_INFRA_FILE logs --tail 80 nginx"
fi

# ── 8. Health summary ─────────────────────────────────────────────────────────
info "Infra stack status:"
docker compose -p infra --env-file .env --env-file compose.env -f "$COMPOSE_INFRA_FILE" ps

info "Apps stack status:"
docker compose -p apps --env-file .env -f "$COMPOSE_APPS_FILE" ps

echo ""
info "Done! Infra: $INSTALL_DIR/$COMPOSE_INFRA_FILE (project: infra)"
info "      Apps:  $INSTALL_DIR/$COMPOSE_APPS_FILE (project: apps)"
info "Logs (infra): docker compose -p infra --env-file .env --env-file compose.env -f $INSTALL_DIR/$COMPOSE_INFRA_FILE logs -f"
info "Logs (apps):  docker compose -p apps --env-file .env -f $INSTALL_DIR/$COMPOSE_APPS_FILE logs -f"
info ""
info "Komodo UI: http://127.0.0.1:9120 on this host (komodo-core binds loopback only). Remote: ssh -L 9120:127.0.0.1:9120 user@${DOMAIN_VAL}"
info "Komodo login — see compose.env for KOMODO_INIT_ADMIN_*."
info "Next: import the apps stack in Komodo (Server Local, run_directory=$INSTALL_DIR, file_paths=[\"$COMPOSE_APPS_FILE\"], project_name=apps, auto_update=true, poll_for_updates=true). See docs/deployment/komodo.md"
info "Schedule procedure \"Global Auto Update\" e.g. every 15 minutes for digest polling."
info "Tip: after changing DOMAIN or CERTBOT_EMAIL in .env, re-run this script to regenerate nginx. Recreate komodo-core if you edit KOMODO_HOST."
