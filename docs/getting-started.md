# Local Development Environment

End-to-end guide: start infrastructure, run migrations, start the app.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| Docker + Docker Compose | any recent version |

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. Create your `.env` files

**Workspace root** (Docker Compose, `pnpm migrate*`, shared defaults):

```bash
cp .env.example .env
```

**Per runnable app** (optional overrides — same keys as root win for that app):

```bash
cp apps/chain-indexer/.env.example apps/chain-indexer/.env
cp apps/query-api/.env.example apps/query-api/.env
cp apps/ipfs-gateway/.env.example apps/ipfs-gateway/.env
cp apps/web/.env.example apps/web/.env
```

You only need app-level `.env` files when you want values that differ from the root `.env`. Precedence:

1. Variables already set in your shell override file-based values.
2. For Nest apps (`chain-indexer`, `query-api`, `ipfs-gateway`), `apps/<app>/.env` overrides the workspace root `.env` for the same key.
3. Next.js reads `apps/web/.env` (and `.env.local`, etc.) from `apps/web/`; use those for web-only settings.

Edit `.env` if you need non-default ports or credentials. Default root compose (`docker-compose.yml` includes `docker-compose.infra.yml`) publishes Postgres, Redis, and IPFS for local `pnpm nx serve` on the host.

### Compose file reference

| File | Use |
|------|-----|
| [`docker-compose.yml`](../docker-compose.yml) | Default entry: infra only (Postgres, Redis, IPFS; ports published) |
| [`docker-compose.infra.yml`](../docker-compose.infra.yml) | Same infra stack (can run directly) |
| [`docker-compose.manual.yml`](../docker-compose.manual.yml) | Full stack: **local Dockerfile builds** (no GHCR) + TLS nginx |
| [`docker-compose.staging.apps.yml`](../docker-compose.staging.apps.yml) | Pre-built apps from GHCR (`:staging`); use with matching `.infra.yml` on VPS |
| [`docker-compose.staging.infra.yml`](../docker-compose.staging.infra.yml) | VPS infra: Postgres, Redis, IPFS, Portainer CE, nginx (`:staging` env) |
| [`docker-compose.production.apps.yml`](../docker-compose.production.apps.yml) | Pre-built apps (`:production`); use with matching `.infra.yml` on VPS |
| [`docker-compose.production.infra.yml`](../docker-compose.production.infra.yml) | VPS infra (`:production` env) |

**CI:** GitHub Actions → **Run workflow** on [`.github/workflows/build-images.yml`](../.github/workflows/build-images.yml): choose **Environment** (`staging` or `production`), the **branch/ref** to build from, and optionally **rebuild all**; pushes to `ghcr.io/waiviogit/<app>:(staging|production)`. With default **rebuild all** off, Nx **affected** uses `--base origin/staging` for **staging** builds and `--base origin/master` for **production** (HEAD is the checked-out ref).

**Portainer CE** (staging/production VPS): **`https://127.0.0.1:9443`** on the host (loopback only) or via **`ssh -L 9443:127.0.0.1:9443`**. Not served through public nginx. [`scripts/setup-vps.sh`](../scripts/setup-vps.sh) uses `.env` only for infra. Full steps: [Portainer deployment](deployment/portainer.md).

**stack-watchdog** (same VPS): optional NestJS sidecar in [`docker-compose.<env>.apps.yml`](../docker-compose.staging.apps.yml) runs **`docker compose pull`** (including **migrator**) and **`compose up -d`** on long-running services about every **5 minutes**. Full detail: [stack-watchdog spec](apps/stack-watchdog/spec/overview.md).

Key variables and their defaults:

| Variable | Default | Used by |
|----------|---------|---------|
| `POSTGRES_USER` | `postgres` | Postgres container + app |
| `POSTGRES_PASSWORD` | `postgres` | Postgres container + app |
| `POSTGRES_DB` | `odl` | Postgres container |
| `POSTGRES_DATABASE` | `odl` | chain-indexer |
| `POSTGRES_HOST` | `localhost` | chain-indexer |
| `POSTGRES_PORT` | `5432` | Postgres container + app |
| `POSTGRES_POOL_MAX` | `10` | chain-indexer |
| `REDIS_URI` | `redis://localhost:6379` | chain-indexer |
| `REDIS_PORT` | `6379` | Redis container |
| `POSTGRES_HOST` | `localhost` | migrations CLI + chain-indexer |
| `START_BLOCK_NUMBER` | `102138605` | chain-indexer |
| `QUERY_API_URL` | `http://localhost:7000` | web (server — query-api **origin**; HTTP paths use `/query/v1/...`) |
| `WEB_THEME_SYNC_URL` | *(unset)* | web (server — optional theme sync endpoint) |

---

## 3. Start infrastructure (Postgres + Redis only)

Start only the services needed for local development — the apps themselves run via Nx:

```bash
docker compose up postgres redis -d
```

Verify both containers are healthy:

```bash
docker compose ps
```

---

## 4. Run database migrations

The migration CLI reads `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DATABASE` (and optionally `POSTGRES_PASSWORD`, `POSTGRES_PORT`) from the environment. With `.env` loaded:

```bash
pnpm migrate
```

Check migration status at any time:

```bash
pnpm migrate:status
```

To roll back the last migration:

```bash
pnpm migrate:down
```

> The CLI automatically loads `.env` from the workspace root via `tsx --env-file=.env`.

---

## 5. Start chain-indexer (dev mode)

```bash
pnpm nx serve chain-indexer
```

This builds in development mode and watches for changes. The app connects to Postgres and Redis on the ports from your `.env`.

To run a one-off production build and start it directly:

```bash
pnpm nx build chain-indexer
node dist/apps/chain-indexer/main.js
```

---

## Useful commands

| Command | Description |
|---------|-------------|
| `docker compose up postgres redis ipfs -d` | Start only infrastructure |
| `docker compose down` | Stop all containers |
| `docker compose down -v` | Stop containers and delete volumes (wipes DB data) |
| `pnpm migrate` | Apply all pending migrations |
| `pnpm migrate:status` | Show migration status |
| `pnpm migrate:down` | Roll back last migration |
| `pnpm nx serve chain-indexer` | Start chain-indexer in watch mode |
| `pnpm nx build chain-indexer` | Production build |
| `pnpm nx test chain-indexer` | Run unit tests |
| `pnpm nx lint chain-indexer` | Run linter |

---

## Troubleshooting

**Postgres connection refused**
Make sure the container is running (`docker compose ps`) and that `POSTGRES_HOST=localhost` and `POSTGRES_PORT` match the published port (see `docker-compose.manual.yml`; default `5432`).

**Migration CLI: connection not configured**
The CLI fails fast if `POSTGRES_HOST`, `POSTGRES_USER`, or `POSTGRES_DATABASE` are missing. Make sure your `.env` is loaded (see step 4).

**Port conflict**
If `5432` or `6379` are in use, change `POSTGRES_PORT` / `REDIS_PORT` in `.env`. Compose maps `${POSTGRES_PORT:-5432}` and `${REDIS_PORT:-6379}` on `postgres` / `redis` in `docker-compose.manual.yml`.
