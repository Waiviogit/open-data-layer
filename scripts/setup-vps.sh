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
  warn "  - Set a strong JWT_SECRET (min 16 chars)"
  warn "  - Set POSTGRES_PASSWORD"
  warn "  - Set AUTH_JWT_SECRET (same as JWT_SECRET or separate)"
  warn "============================================================"
  read -r -p "Press ENTER when .env is ready (or Ctrl+C to abort)..."
fi

# ── 5. Pull images and start stack ────────────────────────────────────────────
info "Pulling images for environment: ${DEPLOY_ENV}..."
docker compose -f "$COMPOSE_FILE" pull

info "Starting stack..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── 7. Health summary ─────────────────────────────────────────────────────────
info "Stack status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
info "Done! Stack running from $INSTALL_DIR using $COMPOSE_FILE"
info "Logs: docker compose -f $INSTALL_DIR/$COMPOSE_FILE logs -f"
info "Stop: docker compose -f $INSTALL_DIR/$COMPOSE_FILE down"
