#!/usr/bin/env bash
# =============================================================================
# VPS bootstrap: Docker, Docker Compose plugin, app stack from GHCR.
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
#   INSTALL_DIR      where to clone          (default: /opt/opden-data-layer)
#   (no GHCR login needed — images are public)
# =============================================================================
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-staging}"
REPO_URL="${REPO_URL:-https://github.com/Waiviogit/open-data-layer.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/opden-data-layer}"
COMPOSE_FILE="docker-compose.${DEPLOY_ENV}.yml"

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
  apt-get install -y -qq ca-certificates curl gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
  info "Docker installed: $(docker --version)"
fi

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

# ── 4b. HTTP Basic Auth for Portainer / nginx ────────────────────────────────
if [[ ! -f nginx/.htpasswd ]]; then
  info "Creating nginx/.htpasswd for Portainer Basic Auth..."
  apt-get update -qq
  apt-get install -y -qq apache2-utils
  read -r -p "Portainer Basic Auth username [admin]: " HTPASSWD_USER
  HTPASSWD_USER="${HTPASSWD_USER:-admin}"
  read -r -s -p "Portainer Basic Auth password: " HTPASSWD_PASS
  echo
  if [[ -z "${HTPASSWD_PASS}" ]]; then
    error "Password must not be empty."
  fi
  htpasswd -bc nginx/.htpasswd "$HTPASSWD_USER" "$HTPASSWD_PASS"
  unset HTPASSWD_PASS
  info "nginx/.htpasswd created for user: $HTPASSWD_USER"
fi

# ── 5. Pull images ────────────────────────────────────────────────────────────
info "Pulling images for environment: ${DEPLOY_ENV}..."
docker compose -f "$COMPOSE_FILE" pull

# ── 6. Start Postgres and run migrations before the full stack ────────────────
info "Starting Postgres..."
docker compose -f "$COMPOSE_FILE" up -d postgres

info "Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
  docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DATABASE:-odl}" \
    &>/dev/null && break
  sleep 2
done
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DATABASE:-odl}" \
  || error "Postgres did not become ready in time."

info "Running database migrations..."
docker compose -f "$COMPOSE_FILE" --profile tools run --rm migrator
info "Migrations complete."

# ── 7. Start full stack ────────────────────────────────────────────────────────
info "Starting stack..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── 8. Health summary ─────────────────────────────────────────────────────────
info "Stack status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
info "Done! Stack running from $INSTALL_DIR using $COMPOSE_FILE"
info "Logs: docker compose -f $INSTALL_DIR/$COMPOSE_FILE logs -f"
info "Stop: docker compose -f $INSTALL_DIR/$COMPOSE_FILE down"
