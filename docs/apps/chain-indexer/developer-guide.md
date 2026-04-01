# chain-indexer

**Back:** [Documentation](../../README.md) · **Related:** [Spec overview](spec/overview.md), [Architecture — Indexer](../../architecture/overview.md), [Getting started](../../getting-started.md)

## Local development

### Prerequisites

- Node.js and **pnpm** (see [getting-started.md](../../getting-started.md))
- **PostgreSQL** with schema applied ([migrations](../../operations/migrations.md))
- **Redis** (block cursor; default `redis://localhost:6379`)
- Reachable **Hive RPC** endpoints via `@opden-data-layer/clients` (URL rotation and options are configurable; see environment table)
- **IPFS HTTP API** (optional) if you need `batch_import` from IPFS — default `http://localhost:5001`

### Start the app

From the repository root:

```bash
pnpm nx serve chain-indexer
```

Production build:

```bash
pnpm nx build chain-indexer
```

The process runs as a Nest **`ApplicationContext`** (no HTTP port). On success, logs include `Hive Blockchain parser started` and per-block timing lines.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm nx serve chain-indexer` | Webpack build + run with watch |
| `pnpm nx build chain-indexer` | Production webpack build to `dist/apps/chain-indexer` |
| `pnpm nx test chain-indexer` | Jest unit tests |
| `pnpm nx lint chain-indexer` | ESLint for `apps/chain-indexer` |

### Verify behaviour

- **Logs:** `Chain indexer running` at bootstrap; `Hive Blockchain parser started`; then `{blockNumber}: {ms}ms` for each processed height.
- **Database:** Rows appear in ODL tables as matching Hive `custom_json` is ingested (see [Data model flow](../../spec/data-model/flow.md)).
- **Lint/test:** `pnpm nx lint chain-indexer` and `pnpm nx test chain-indexer`.

---

## 1) Purpose (summary)

**chain-indexer** is the Hive **write path**: sequential block ingestion, ODL `custom_json` parsing, validation against domain registries, and PostgreSQL persistence. Normative behavior is specified in [spec/overview.md](spec/overview.md) and feature specs under [spec/](spec/).

---

## 2) Environment variables

Values are validated in [`apps/chain-indexer/src/config/env.validation.ts`](../../../apps/chain-indexer/src/config/env.validation.ts) and mapped in [`apps/chain-indexer/src/config/chain-indexer.config.ts`](../../../apps/chain-indexer/src/config/chain-indexer.config.ts). Additional `process.env` reads are noted below.

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_HOST` | No | `localhost` | Database host |
| `POSTGRES_PORT` | No | `5432` | Database port |
| `POSTGRES_DATABASE` | No | `odl` | Database name |
| `POSTGRES_USER` | No | `postgres` | Database user |
| `POSTGRES_PASSWORD` | No | — | Database password |
| `POSTGRES_POOL_MAX` | No | `10` | Pool size |
| `REDIS_URI` | No | `redis://localhost:6379` | Redis for block cursor |
| `START_BLOCK_NUMBER` | No | see `env.validation.ts` | First block height if cursor key missing |
| `BLOCK_NUMBER_KEY` | No | `chain_indexer:block_number` | Redis key for current height |

### Hive client tuning

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HIVE_CACHE_PREFIX` | No | — | Optional Redis cache prefix for Hive client |
| `HIVE_CACHE_TTL_SECONDS` | No | — | Cache TTL |
| `HIVE_MAX_RESPONSE_TIME_MS` | No | — | Per-request timeout budget |
| `HIVE_URL_ROTATION_DB` | No | — | DB index for URL rotation |
| `ODL_NETWORK` | No | `mainnet` | `mainnet` → ODL id `odl-mainnet`; `testnet` → `odl-testnet` |

### IPFS (batch import)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `IPFS_API_URL` | No | `http://localhost:5001` | Kubo (or compatible) HTTP API for `cat` |
| `IPFS_GATEWAY_URL` | No | — | Optional gateway URL for clients (indexer uses API URL for `cat`) |
| `BATCH_IMPORT_MAX_RETRIES` | No | `3` | Retries for `ipfs` `cat` in batch import |
| `BATCH_IMPORT_RETRY_DELAY_MS` | No | `1000` | Base delay for exponential backoff (ms) |

### Other (read in config, not all in Zod schema)

| Variable | Default | Description |
|----------|---------|-------------|
| `HANDLER_CUSTOM_JSON_ENABLED` | enabled unless `false` | Exposed as `hive.handlers.customJson.enabled`; see [hive-ingestion.md](spec/hive-ingestion.md) for parser wiring notes |

Copy from [`.env.example`](../../../.env.example) at the repo root as a starting point.

---

## 3) Docker

[`apps/chain-indexer/Dockerfile`](../../../apps/chain-indexer/Dockerfile) multi-stage build:

1. Install dependencies, copy app + libs, run `pnpm nx run chain-indexer:prune-lockfile`.
2. Production image: copy `dist/apps/chain-indexer`, `pnpm install --frozen-lockfile --prod`, `CMD ["node", "main.js"]`.

Deploy with the same environment variables as local (typically injected by your orchestrator). Ensure Postgres, Redis, Hive, and (if used) IPFS are reachable from the container network.

---

## 4) Operations

### Migrations

Apply database migrations before first run; see [migrations](../../operations/migrations.md).

### Replaying or skipping blocks

- **Cursor:** Stored in Redis at `BLOCK_NUMBER_KEY`. Delete the key or set it to a decimal string height to change where ingestion continues.
- **Default start:** If the key is absent, `START_BLOCK_NUMBER` is used (see `env.validation.ts`).

### Failure behavior

If `getBlock` fails, the processor logs the error, waits **2 seconds**, and retries the **same** height (cursor is not advanced). See [hive-ingestion.md](spec/hive-ingestion.md).

### SIGINT / SIGTERM

[`main.ts`](../../../apps/chain-indexer/src/main.ts) closes the Nest context on these signals.

---

## 5) Related documentation

| Doc | Description |
|-----|-------------|
| [spec/overview.md](spec/overview.md) | Normative app overview and feature index |
| [hive-ingestion.md](spec/hive-ingestion.md) | Block loop and Redis cursor |
| [odl-pipeline.md](spec/odl-pipeline.md) | ODL envelope, handlers, batch import |
| [Specification index](../../spec/README.md) | Domain specs |
| [Data model flow](../../spec/data-model/flow.md) | PostgreSQL flows |
