# Open Data Layer

**Documentation:** [docs/](docs/README.md) — getting started, architecture, standards, operations, per-app guides.

**Specification:** [docs/spec/](docs/spec/README.md) — domain specs, data model, governance, normative docs.

## Production VPS (bootstrap)

The [`scripts/setup-vps.sh`](scripts/setup-vps.sh) script installs Docker and the Compose plugin on a fresh Linux VPS, clones this repository, prepares `.env` from [`.env.example`](.env.example), and starts the stack with pre-built images from GHCR.

**Run as root** (for example on Ubuntu). Point DNS **A/AAAA** for your public hostname to this server before first start so Let's Encrypt can validate.

**Production** (uses [`docker-compose.production.apps.yml`](docker-compose.production.apps.yml) + [`docker-compose.production.infra.yml`](docker-compose.production.infra.yml); images tagged `:production`):

```bash
curl -fsSL https://raw.githubusercontent.com/Waiviogit/open-data-layer/master/scripts/setup-vps.sh | \
  DEPLOY_ENV=production bash
```

Optional overrides: `REPO_URL` (git clone URL), `INSTALL_DIR` (default `/opt/open-data-layer`). Public GHCR images do not require Docker login.

After `.env` is created, edit it at least for production: **`DOMAIN`**, **`CERTBOT_EMAIL`**, **`JWT_SECRET`**, **`POSTGRES_PASSWORD`**, and **`AUTH_JWT_SECRET`** (if used). The stack serves HTTPS via `jonasal/nginx-certbot`. **Komodo** (stack manager + image polling) is at `https://<DOMAIN>/komodo/` (outer Basic Auth + Komodo login). Import the `apps` Compose project in Komodo and enable `auto_update` / `poll_for_updates` per [docs/deployment/komodo.md](docs/deployment/komodo.md). More on Compose files: [docs/getting-started.md](docs/getting-started.md).
