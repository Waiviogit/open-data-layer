---
id: docs-standards-test-postgres-harness
title: Test Postgres harness
description: Local disposable Postgres for migration integration specs.
type: spec
status: active
scope: platform
tags: [testing, postgres]
related:
  - docs/standards/testing-rules.md
---

# Test Postgres harness

Integration specs that need real Postgres constraints (e.g. activity dedup unique index) use a **separate** compose file — never the dev database.

## Start / stop

```bash
pnpm test:db:up    # docker compose -p odl-test -f docker-compose.test.yml
pnpm nx test migrations
pnpm test:db:down
```

Or `pnpm test:db` (up → test → down).

- Port **55432** (local), credentials `test` / `test`, database name **`test`**
- Image: `postgis/postgis:18-3.6` (PostGIS + pg_trgm required by migrations)
- Data on **tmpfs** — destroyed when the container stops

## Library

`@opden-data-layer/test-postgres`:

- `assertTestDatabase(url)` — refuses any database name other than exactly `test`
- `withRollback(db, fn)` — runs `fn` in a transaction that always rolls back
- `createTestDb()`, `waitForTestPostgres()`, `resolveTestPostgresUrl()`

Migrations run in `libs/migrations/src/test/global-setup.ts` via `migrateToLatest` from `@opden-data-layer/migrations` (not in test-postgres).

## CI

`.github/workflows/verify.yml` job `migrations-db` runs `pnpm test:db` with `POSTGRES_TEST_URL=postgres://test:test@127.0.0.1:55432/test`.
