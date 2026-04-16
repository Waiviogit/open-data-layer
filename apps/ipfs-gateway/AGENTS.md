# ipfs-gateway — agent rules

Specialization for this app. **Shared policy** (monorepo, NestJS, config validation, logging, testing, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md). Do not duplicate that here.

## Role

HTTP API for IPFS-backed upload, content proxy, MFS namespaces, and related operations. **No Postgres / Kysely** — there is no `database/` or `repositories/` layer in this app.

## Source layout

```
src/
  config/          env.validation.ts + ipfs-gateway.config.ts
  constants/       upload limits, MFS namespace keys, content-type helpers
  controllers/     HTTP controllers (barrel index.ts)
  domain/          injectable services (gateway read, image processing, MFS init, pin sync)
  openapi/         per-area spec + registry + generate script
```

## Data access

- All IPFS I/O goes through **`IpfsClientModule`** from `@opden-data-layer/clients`.
- Do **not** construct low-level IPFS clients ad hoc in controllers.

## Domain services

- Controllers stay thin: validate input, call a **domain service**, map errors/responses.
- There is **no repository pattern** here — services wrap the shared client and encapsulate retries, paths, and typing.

## Scheduled work

- Cron / scheduled tasks (`@Cron` etc.) belong in **domain services** (e.g. pin sync), with `ScheduleModule` wired from the root module.

## Image processing

- **`ImageProcessorService`**: keep CPU-bound image work **synchronous** and in-memory; avoid mixing heavy async IPFS calls inside the same method — fetch first, then process, or split responsibilities clearly.

## Upload limits

- Centralize limits in **`constants/upload.constants.ts`** (and related constants). Do **not** hardcode sizes or magic numbers in controllers or services.

## OpenAPI

- Mirror **query-api** style: fragments under `openapi/`, `setup-swagger`, generated artifacts as established in this app.
