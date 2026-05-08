# Migrations Guide

Operational guide for the `@opden-data-layer/migrations` library: running migrations, adding new ones, and snapshot/restore.

---

## Overview

Migrations use **Kysely's built-in Migrator**:

- **Tracking:** Kysely creates and uses `kysely_migration` (executed migrations) and `kysely_migration_lock` (advisory lock).
- **Locking:** Only one process can run migrations at a time; concurrent calls are serialized.
- **Up/down:** Each migration has `up(db)` and `down(db)`; you can roll back with `migrateDown` or `migrateTo(name)` when `down` is implemented. The bundled base migration `00001_odl_schema` uses a stub `down` (drop DB and re-run `up` in dev).

The library is engine- and schema-aware: migrations are grouped by database (e.g. Postgres) and schema (e.g. ODL). Today only Postgres ODL is implemented; the structure supports adding Redis, ClickHouse, etc. later.

---

## Folder structure

```
libs/migrations/src/
  postgres/
    odl/                          # ODL schema (objects_core, object_updates, votes, accounts_current, posts, post_*)
      00001_odl_schema.ts         # consolidated DDL (former 00001–00008); add 00002_… for new changes
      index.ts                    # MIGRATIONS record for OdlMigrationProvider
  cli.ts                          # CLI entry (latest | down | status)
  provider.ts                     # OdlMigrationProvider
  runner.ts                       # migrateToLatest, migrateDown, migrateTo, getMigrationStatus
  snapshot.ts                     # createSnapshot, restoreSnapshot, resetDatabase
  index.ts                        # Public API
```

**Adding another database later:** Create a new folder (e.g. `postgres/analytics/` or `redis/cache/`), add migration files and an `index.ts` that exports a `MIGRATIONS` record, and a corresponding provider + runner (or extend the runner to accept a provider/engine name).

---

## Writing a new migration

1. **Add a new file** in `libs/migrations/src/postgres/odl/` with a name that sorts after the last one (e.g. `00002_add_some_table.ts`).

2. **Implement `up` and `down`** using Kysely's `sql` tagged template:

```typescript
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE my_new_table (id SERIAL PRIMARY KEY, name TEXT)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS my_new_table`.execute(db);
}
```

3. **Register the migration** in `libs/migrations/src/postgres/odl/index.ts`:

```typescript
import * as m00001 from './00001_odl_schema';
import * as m00002 from './00002_add_some_table';
import type { Migration } from 'kysely';

export const MIGRATIONS: Record<string, Migration> = {
  '00001_odl_schema': { up: m00001.up, down: m00001.down },
  '00002_add_some_table': { up: m00002.up, down: m00002.down },
};
```

Migrations run in **alphanumeric order** of the keys. Do not rename or remove already-applied migrations; add new ones only.

---

## CLI commands

All commands read connection details from `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DATABASE` (and optionally `POSTGRES_PASSWORD`, `POSTGRES_PORT`). Use a `.env` file or export them in the shell.

| Command | Description |
|--------|-------------|
| `pnpm migrate` or `pnpm migrate:latest` | Run all pending migrations to the latest version. |
| `pnpm migrate:down` | Roll back the last executed migration. |
| `pnpm migrate:status` | List all migrations and their status (executed timestamp or `pending`). |

Example (host-only, Postgres running locally or in Docker with published port):

```bash
export POSTGRES_HOST=localhost
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_DATABASE=odl
pnpm migrate
pnpm migrate:status
```

---

## Programmatic API

You can run migrations from application code by passing either a **Kysely instance** or a **pg connection config**:

```typescript
import { migrateToLatest, migrateDown, getMigrationStatus } from '@opden-data-layer/migrations';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

// Option A: pass a Kysely instance (reuse existing connection)
const db = new Kysely<OdlDatabase>({
  dialect: new PostgresDialect({ pool: new Pool({ host: process.env.POSTGRES_HOST, user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD, database: process.env.POSTGRES_DATABASE }) }),
});
const result = await migrateToLatest(db);
if (result.error) throw result.error;

// Option B: pass connection config (library creates and destroys its own connection)
import { resolveConnectionString } from '@opden-data-layer/migrations';
const result = await migrateToLatest({ connectionString: resolveConnectionString() });

// Rollback last migration
await migrateDown(db);

// Check status
const status = await getMigrationStatus(db);
// => [{ name: '00001_odl_schema', executedAt: Date }, { name: '00002_...', executedAt: undefined }, ...]
```

All runner functions return a **MigrationResultSet** (or, for `getMigrationStatus`, an array of `{ name, executedAt }`). For `migrateToLatest` / `migrateDown` / `migrateTo`, check `result.error` and `result.results`; they never throw.

---

## Snapshot / Restore

Snapshot and restore use PostgreSQL's **pg_dump** and **pg_restore** CLI tools. They must be on the system **PATH** (e.g. from a full Postgres client install or package manager).

| Function | Purpose |
|----------|---------|
| `createSnapshot(options)` | Dump the database to a file (custom format `-Fc`). Option `schemaOnly: true` for schema-only. |
| `restoreSnapshot(options)` | Restore from a dump file. Option `clean: true` to drop existing objects before restore. |
| `resetDatabase(options)` | Same as `restoreSnapshot` with `clean: true` (convenience for dev/test resets). |

Example:

```typescript
import { createSnapshot, restoreSnapshot, resetDatabase } from '@opden-data-layer/migrations';

import { resolveConnectionString } from '@opden-data-layer/migrations';

const connectionString = resolveConnectionString();

await createSnapshot({
  connectionString,
  outputPath: './snapshots/backup.dump',
  schemaOnly: false,
});

await restoreSnapshot({
  connectionString,
  inputPath: './snapshots/backup.dump',
  clean: true,
});

// Or for a full reset (drop + restore):
await resetDatabase({
  connectionString,
  inputPath: './snapshots/backup.dump',
});
```

Custom format (`.dump`) is used by default so that `pg_restore` can use `--clean --if-exists` and optional parallel jobs. If `pg_dump` or `pg_restore` is not on PATH, you can pass `pgDumpPath` or `pgRestorePath` in the options.

---

## Troubleshooting

**Lock stuck**

If a migration process crashes while holding the lock, the next run may wait. Kysely’s lock is a row in `kysely_migration_lock`. In rare cases you may need to inspect that table and ensure no long-running transaction is holding it; normally the lock is released when the connection closes.

**Migration order conflicts**

Kysely expects migrations to run in alphanumeric order. If you add a new migration whose name sorts *before* an already-executed one, `migrateToLatest` can report an error (depending on `allowUnorderedMigrations`). Fix by naming new migrations so they sort after the latest (e.g. `00003_...` after `00002_...`).

**Migration CLI: connection not configured**

The CLI scripts (`pnpm migrate`, `pnpm migrate:status`, etc.) load `.env` automatically from the workspace root via `tsx --env-file=.env`. If you run the CLI directly without going through the package scripts, export `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DATABASE` (and optionally `POSTGRES_PASSWORD`, `POSTGRES_PORT`) in the shell first.

---

## Related

- **Schema and types:** [`data-model/schema.sql`](../spec/data-model/schema.sql), [`data-model/flow.md`](../spec/data-model/flow.md), and `@opden-data-layer/core` (`OdlDatabase`, table row types).
- **Kysely:** [kysely.dev/docs](https://kysely.dev/docs), including [Migrations](https://kysely.dev/docs/migrations).
- **Mongo → Postgres data import** (one-off JSON array loads, not Kysely schema migrations): [`scripts/migrate-mongo-to-pg/README.md`](../../scripts/migrate-mongo-to-pg/README.md) (`pnpm migrate:mongo-objects`, `pnpm migrate:mongo-posts`).

---

## Running migrations on VPS / Docker

Use the **`migrator`** image (`ghcr.io/waiviogit/migrator:(staging|production)`). It bundles `libs/migrations`, `libs/core`, `scripts/`, and runs commands with `pnpm` / `tsx` (no `.env` file required inside the image—pass env vars or `--env-file`).

The compose files pass `POSTGRES_HOST: postgres` (the Compose service name) to the migrator; all other `POSTGRES_*` come from `.env` via `env_file`. For bare `docker run`, set them explicitly.

Discover the shared VPS network with `docker network ls` (staging/production **`opden-data-layer-net`** from `scripts/setup-vps.sh`).

### Schema migrations (no extra files)

```bash
# Ephemeral one-off via Compose (recommended — env is loaded automatically).
# Apps stack project name is `apps` (see scripts/setup-vps.sh).
docker compose -p apps --env-file .env -f docker-compose.production.apps.yml --profile tools run --rm migrator

# Plain docker run (replace network and credentials; production apps use external network opden-data-layer-net)
docker run --rm \
  --network opden-data-layer-net \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=PASS \
  -e POSTGRES_DATABASE=odl \
  ghcr.io/waiviogit/migrator:production

# Status
docker run --rm \
  --network opden-data-layer-net \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=PASS \
  -e POSTGRES_DATABASE=odl \
  ghcr.io/waiviogit/migrator:production \
  pnpm exec tsx libs/migrations/src/cli.ts status

# Roll back last migration
docker run --rm \
  --network opden-data-layer-net \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=PASS \
  -e POSTGRES_DATABASE=odl \
  ghcr.io/waiviogit/migrator:production \
  pnpm exec tsx libs/migrations/src/cli.ts down
```

### Mongo data import (mount JSON files)

Do not bake export files into the image; mount them with `-v`:

```bash
docker run --rm \
  --network opden-data-layer-net \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=PASS \
  -e POSTGRES_DATABASE=odl \
  -v /path/to/wobjects.json:/data/wobjects.json \
  ghcr.io/waiviogit/migrator:production \
  pnpm migrate:mongo-objects /data/wobjects.json

# Large wobject dump: drop/recreate heavy indexes during load
docker run --rm \
  --network opden-data-layer-net \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=PASS \
  -e POSTGRES_DATABASE=odl \
  -v /path/to/wobjects.json:/data/wobjects.json \
  ghcr.io/waiviogit/migrator:production \
  pnpm migrate:mongo-objects /data/wobjects.json --skip-indexes

# Posts export
docker run --rm \
  --network opden-data-layer-net \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=PASS \
  -e POSTGRES_DATABASE=odl \
  -v /path/to/posts.json:/data/posts.json \
  ghcr.io/waiviogit/migrator:production \
  pnpm migrate:mongo-posts /data/posts.json
```

Other package scripts from the root `package.json` work the same way (e.g. `pnpm migrate:mongo-users`, `pnpm backfill:threads`) as long as their inputs are passed via mounted paths or env.

### Local manual stack

```bash
docker compose -f docker-compose.manual.yml --profile tools run --rm migrator
```

Build context uses [`apps/migrator/Dockerfile`](../../apps/migrator/Dockerfile).
