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

Edit `.env` if you need non-default ports or credentials. The defaults work with the `docker-compose.yml` as-is.

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
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/odl` | migrations CLI |
| `START_BLOCK_NUMBER` | `102138605` | chain-indexer |
| `BLOCK_NUMBER_KEY` | `chain_indexer:block_number` | chain-indexer |
| `QUERY_API_URL` | `http://localhost:3000` | web (server — query-api **origin**; HTTP paths use `/query/v1/...`) |
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

The migration CLI reads `DATABASE_URL` from the environment. With `.env` loaded:

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
Make sure the container is running (`docker compose ps`) and that `POSTGRES_HOST=localhost` and `POSTGRES_PORT` match the exposed port in `docker-compose.yml`.

**`DATABASE_URL` not set (migration CLI)**
The CLI fails fast with `DATABASE_URL is required`. Source your `.env` before running migrations (see step 4).

**Port conflict**
If `5432` or `6379` are in use, change `POSTGRES_PORT` / `REDIS_PORT` in `.env`. The `docker-compose.yml` reads these via `${POSTGRES_PORT:-5432}` / `${REDIS_PORT:-6379}`.
