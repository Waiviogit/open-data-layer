# AGENTS.md

Nx monorepo: NestJS apps with Postgres, Redis, Hive, or other runtimes as needed. All changes must be production-ready.

## General Principles

- Prefer simplicity over cleverness.
- Avoid premature abstraction.
- Keep modules loosely coupled.
- Prefer explicit over implicit behavior.
- Prefer small, focused functions.
- Prefer composition over inheritance.
- Avoid deep nesting — prefer early returns.
- Avoid magic numbers — use constants.
- No dead or commented-out code. Comments in English only.
- Do not introduce breaking changes silently.
- Update types when modifying contracts. Do not commit `.env` files or secrets.

## Project Context

- `apps/` — runnable NestJS applications (e.g. `chain-indexer`, `query-api`, `auth-api`) and Next.js (`web`).
- `libs/` — reusable NestJS libraries (e.g. `@opden-data-layer/clients`, `@opden-data-layer/core`); add via Nx generators when needed.
- `nx.json` — Nx workspace configuration.

## Coding Rules

### Architecture & Layering

App structure inside `apps/<app>/src/`:
- `config/` — env validation (Zod), config factories
- `constants/` — app-specific constants
- `domain/` — business logic, parsers, handlers, schemas
- `repositories/` — app-specific repository implementations

Rules:
- Controllers must not contain business logic.
- Repositories must not contain business logic (data access only — queries, writes, projections).
- Repository layer: use **Kysely** for type-safe SQL (https://kysely.dev/docs). Returns typed data, hides driver internals.
- Service/domain layer: formulas, calculations, decisions, orchestration across repositories.
- Red flags — move to repository: service builds raw SQL/queries. Move to service: repository has `if/else` decisions or calls other repositories.

### Transaction boundaries

- The **service/domain layer** owns transaction boundaries: it calls `db.transaction().execute(...)` (inject `Kysely` where needed) or `repository.runInTransaction(...)` when a repository exposes that helper.
- **Repositories** accept an optional `trx` parameter (same Kysely API as the root client) and use a local executor: `executor(trx?: DbExecutor): DbExecutor { return trx ?? this.db; }`. Public methods run queries on `this.executor(trx)`.
- A repository **must not** start nested transactions for the same work unless it exposes an explicit `runInTransaction` for callers to use as the single boundary.
- See `apps/chain-indexer/src/repositories/social-graph.repository.ts` (executor + optional `trx` + `runInTransaction`) and `apps/chain-indexer/src/domain/hive-vote/vote-hive.service.ts` (service-owned `db.transaction()` passing `trx` into repos).

```ts
// repository
executor(trx?: DbExecutor): DbExecutor {
  return trx ?? this.db;
}
async insert(data: NewRow, trx?: DbExecutor): Promise<void> {
  await this.executor(trx).insertInto('table').values(data).execute();
}

// service
await this.db.transaction().execute(async (trx) => {
  await this.fooRepository.insert(data, trx);
  await this.barRepository.update(id, trx);
});
```

### Module Boundaries

- Apps must not depend on other apps.
- Libs must not import from apps. Avoid circular dependencies.
- Apps import from libs only via package name (e.g. `@opden-data-layer/*`).
- Libs import from other libs only via barrel exports (`index.ts`). Never import deep internal files from another lib.
- Every lib must have a barrel `index.ts` at `libs/<lib>/src/index.ts`. Every sub-module within a lib should have its own `index.ts`.
- Each project has a `project.json` defining targets (build, serve, test, lint, e2e).
- Project tags (e.g. `type:app`, `type:lib`, `scope:shared`, `scope:infra`, `scope:domain`) set in `project.json`.
- ESLint `@nx/enforce-module-boundaries` enforces: apps depend only on libs; `scope:shared` libs have no internal lib deps; `scope:infra` may depend on `scope:shared`; `scope:domain` may depend on `scope:infra` and `scope:shared`. Do not violate these constraints.

### Domain Constants

- Domain-specific constants (object types, field names, supposed updates, translations) belong in `@opden-data-layer/domain-constants` when it exists.
- Keep `@opden-data-layer/common` generic (utilities, non-domain). Keep `@opden-data-layer/clients` free of domain business rules.

### Strategy-Based Decomposition

- Split large orchestrator services into a thin orchestrator + strategy classes implementing a common interface (e.g. `supports(context)` / `execute(context)`).
- Add new behavior by adding new strategy classes, not by expanding a single large service.

### Event-Driven Coordination

- Use `EventEmitter2` (`@nestjs/event-emitter`) for in-process domain events (notifications, cache updates, external calls).
- Emit typed domain events from core handlers; subscribe with dedicated handlers to keep core logic decoupled.
- Keep event payloads typed and handlers idempotent where possible.

### Type Safety

- `strictNullChecks: true`. Prefer explicit types. Avoid widening `any`; prefer `unknown` for new code.
- Use Zod for runtime validation of: env vars, blockchain payloads, HTTP request bodies.
- Never trust external input (blockchain data, API requests, env vars).

### Configuration

- No hardcoded secrets. All config via environment variables. `.env` files are gitignored.
- Each app must have:
  - `config/env.validation.ts` — Zod schema + validate function
  - `config/<app>.config.ts` — config factory (default export)
- Use `ConfigModule.forRoot({ isGlobal: true, validate, load })`. Fail fast on invalid config.

### Logging

- Use `Logger` from `@nestjs/common`. Create per class: `new Logger(ClassName.name)`.
- No `console.log` in production. Do not log secrets or connection strings.
- Log errors with context: `this.logger.error(error.message)`.

| Level | When to use |
|-------|-------------|
| `error` | Caught exceptions, infrastructure failures (DB, Redis, HTTP), unrecoverable errors |
| `warn` | Invalid/unexpected data, skipped work, soft mismatches (signer, schema), degraded state |
| `log` | Significant lifecycle events: connect/disconnect, sync milestones, batch completions |
| `debug` | Internal traces useful during development; should not appear in normal production logs |
| `verbose` | Not used — do not add |

### Error Handling

- There is **no shared repository base class** in `libs/`. Follow this convention in repositories: wrap public methods in `try/catch`, log with `this.logger.error((e as Error).message)`, and return `null` or `[]` for reads so callers can handle absence. **Re-throw** when the caller must know about the failure (e.g. writes where partial success is dangerous). Reference: [`apps/auth-api/src/repositories/challenges.repository.ts`](apps/auth-api/src/repositories/challenges.repository.ts).
- Service/domain layer must check for `null` returns and handle appropriately.
- Use typed error classes for domain errors. Map domain errors to HTTP responses in controllers.
- Do not expose stack traces to clients. Fail fast for unrecoverable errors (invalid config, missing connections).

### Security

- Validate and sanitize all external input (blockchain JSON, API requests).
- Parameterize all DB queries — no raw string interpolation.
- Use explicit field mapping — no mass assignment.
- Prevent prototype pollution when parsing custom JSON from blockchain.
- Secrets only via env vars, never committed.

### Performance

- In blockchain/high-throughput code: avoid blocking operations in parsers, be mindful of memory, avoid unnecessary allocations in block/transaction loops.
- Database pool and Redis URL rotation are pre-configured in the shared clients lib.

### Redis conventions

- Always use `db0`. Do not use multiple Redis databases (`db1`, `db2`, etc.)
- Isolate data via key namespaces: `session:user:{id}`, `cache:block:{num}`, `lock:{resource}`
- Reason: multiple DBs break Redis Cluster compatibility and complicate connection pooling
- **ioredis**: do not import `ioredis` directly in apps or domain code. Use **`RedisClientFactory`**
  from `@opden-data-layer/clients`: inject it (via `RedisModule`) and call `getClient()` (default `db = 0`).
  The factory caches one wrapper per `db` index — do not call `new Redis(...)` yourself.
  Type against `RedisClientInterface`, not the raw `ioredis` `Redis` class.
  Implementation: `libs/clients/src/redis-client/`.

#### TTL

- Every key written to Redis **must** have a TTL unless it is an intentionally persistent structure.
- Set TTL at write time via `SET key value EX <seconds>` or `EXPIRE` immediately after write — never leave it implicit.
- Define TTL values as named constants in `constants/` (e.g. `CACHE_TTL_BLOCK_SEC = 60`). No magic numbers.
- If a key can grow unboundedly (e.g. a set of processed tx hashes), use a TTL or an explicit eviction strategy — document which.

#### Key naming

Keys must follow the pattern: `{app_name}:{purpose}:{identifier}`

| Segment      | Value                              |
|--------------|------------------------------------|
| `app_name`   | Nx project name (e.g. `auth-api`, `chain-indexer`, `query-api`) |
| `purpose`    | `cache`, `lock`, `session`, `queue` |
| `identifier` | Entity-specific ID (e.g. `block:12345`, `user:abc`, `tx:0xdeadbeef`) |

Examples:
- `chain-indexer:cache:block:12345`
- `auth-api:session:user:abc123`
- `chain-indexer:lock:sync:head`
- `query-api:cache:account:alice`

Rules:
- Use **kebab-case** for `app_name` (matches Nx project name).
- Use **snake_case** forbidden — colons are the only separator.
- Never use dynamic or unpredictable segments without a fixed prefix.
- Define the full key pattern as a typed constant or factory function in `constants/`:

```ts
// apps/<app>/src/constants/redis-keys.ts
import { buildRedisKey } from '@opden-data-layer/core';

const APP = 'chain-indexer';

export const redisKey = {
  blockCache: (num: number) => buildRedisKey(APP, 'cache', 'block', num),
  syncLock: () => buildRedisKey(APP, 'lock', 'sync', 'head'),
} as const;
```

#### Key scanning

- **Never use `KEYS *`** (or `KEYS <pattern>`) in production code — it blocks the Redis event loop and is dangerous at scale.
- Use **`SCAN`** with a cursor and a reasonable `COUNT` hint instead.
- In high-throughput indexer paths, avoid scanning altogether — design data structures so lookup is O(1) (e.g. `GET`, `HGET`, `SISMEMBER`).

### Code Style

- ESLint flat config (`eslint.config.mjs`) with typescript-eslint + Prettier.
- Prettier: single quotes, trailing commas (all), auto endOfLine.
- Use descriptive names.

### Web app (`apps/web`)

All rules for design tokens, shell mode, images, React hydration, and clean architecture are in [`apps/web/AGENTS.md`](apps/web/AGENTS.md).

### Testing

- Jest with `ts-jest`. Unit tests: `*.spec.ts` co-located with source.
- E2E tests: separate Nx project `apps/<app>-e2e/src/`.
- **HTTP in E2E**: use the built-in **`fetch` API** for HTTP calls. Do not add **axios** (or similar HTTP client libraries) — not used in this repo.
- Domain/business logic must be unit-testable without NestJS container. Mock infrastructure.
- Test behavior, not implementation.
- Commands: `pnpm nx test <project>`, `--watch`, `--coverage`.

## Workflow Rules

### Nx Commands

- Always run tasks through `nx` (`nx run`, `nx run-many`, `nx affected`) — not via underlying tooling directly.
- Prefix Nx commands with pnpm: `pnpm nx build`, `pnpm nx test`, etc.
- Use the Nx MCP server and its tools when available.
- For workspace exploration, invoke the `nx-workspace` skill first.
- NEVER guess CLI flags — check `nx_docs` or `--help` first when unsure.
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md` if it exists.

### Scaffolding (Nx Generators Only)

- New apps and libs MUST be created via Nx generators only. Never create by hand.
- Always invoke the `nx-generate` skill first for any scaffolding task.
- After scaffolding a new app, immediately add `apps/<app>/package.json` (the Nx Nest generator does not create it).
  - Format: `name: @opden-data-layer/<app>`, `version: 0.0.0`, `private: true`, dependencies include at minimum `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`. Match version ranges to root `package.json`.


### Package Management

- Use **pnpm** for all dependency operations: `pnpm install`, `pnpm add <pkg>`, `pnpm update`.
- Install all new dependencies at root. Never manually write versions into `package.json`.
- Shared deps at root; keep dependency graph minimal.
- Key runtime deps (add at root as needed): `@nestjs/*`, `reflect-metadata`, `rxjs`, `zod`, `kysely`, `pg`, `ioredis`, `@hiveio/dhive`.
- Declare `implicitDependencies` in `project.json` for correct Nx project graph.

### Build & Deploy

- Dev: `pnpm nx serve <project>` (watch mode, uses root `node_modules`).
- Build: `pnpm nx build <app>` — webpack auto-generates `dist/apps/<app>/package.json` with only used packages.
- Prune (optional, for Docker): `pnpm nx run <app>:prune-lockfile` — generates minimal lockfile.
- Deploy: `cd dist/apps/<app> && pnpm install --frozen-lockfile --prod && node main`.
- Docker: add `apps/<app>/Dockerfile` when containerized deployment is needed.
- Libraries are bundled into app builds via webpack; standalone lib builds work best for libs without workspace deps.

### External library docs

- Prefer latest official docs: NestJS v11 (https://docs.nestjs.com), Zod (https://zod.dev), Kysely (https://kysely.dev/docs), dhive (https://github.com/openhive-network/dhive).
- Use context7 MCP when available. Do not rely on outdated blog posts.

## Project documentation

Full standards: [`docs/standards/docs-standards.md`](docs/standards/docs-standards.md).

### Where to find docs

- Start at [`docs/README.md`](docs/README.md).
- Domain specs: [`docs/spec/README.md`](docs/spec/README.md).
- Per-app docs: `docs/apps/<app>/`.
- Architecture: [`docs/architecture/overview.md`](docs/architecture/overview.md), ADRs under [`docs/architecture/adr/`](docs/architecture/adr/).

### Doc structure rules

- **One description, one place** — never duplicate prose; cross-link with relative Markdown paths.
- **`overview.md` must stay slim** — purpose, scope/stack, feature index table, verification commands. No feature detail.
- **One feature, one file** — each feature gets its own `<feature>.md` under the app's `spec/` folder. Add a row to the overview's "Feature specs" table.
- **Split when needed** — if a file exceeds ~150 lines or covers two unrelated topics, split into separate files.
- **Prefer many small files** over few large files.

### When to create or update docs

- **Missing spec** — if you add behavior and no spec exists, create `docs/apps/<app>/spec/<feature>.md` (or `docs/spec/<topic>.md` for cross-cutting) in the same change.
- **Spec vs code** — if implementation diverges from spec, update the spec or mark explicitly: `> **TODO: spec-code divergence**`.
- **Behavior change** — update the corresponding doc in the same PR.
- **Generated registry docs** — `pnpm tsx scripts/gen-object-types-spec.ts` and `pnpm tsx scripts/gen-object-updates-spec.ts` write to `generated/` (gitignored). Source of truth: `OBJECT_TYPE_REGISTRY` and `UPDATE_REGISTRY` in `@opden-data-layer/core`; never edit generated files by hand.
- **Code comments** — `@see` references use repo-root paths such as `docs/spec/data-model/flow.md`.

## Restrictions

- Never create apps or libs by hand — use Nx generators.
- Never manually write dependency versions into `package.json`.
- Never import deep internal files from another lib — use barrel exports only.
- Never add business logic to repositories or controllers.
- Never add orchestration (calling other repositories) inside a repository.
- Never hardcode secrets or connection strings — env vars only.
- Never commit `.env` files or secrets.
- Never use `console.log` in production code.
- Never expose stack traces to API clients.
- Never trust external input without validation.
- Never violate `@nx/enforce-module-boundaries` constraints.
- Never use raw string interpolation in DB queries.
- Never commit `generated/` (registry Markdown output) or edit those files by hand.
- Never add **axios** or use it for HTTP — use **`fetch`** (e.g. in E2E tests).
- Never violate `apps/web`-specific conventions — see [`apps/web/AGENTS.md`](apps/web/AGENTS.md).

### Conflict resolution:

1. Precedence order (lowest to highest):
   System (model-level) > Developer (agent-level) > Skill > AGENTS.md > README.md > User prompt.
   If the priority is higher, then settings can overwrite previous.

2. If you have some conflicts in docs, you must tell me.
   Most important to know conflicts with System or Developer prompt,
   because I can't know them beforehand.
   Stop the session execution while conflicts will not be resolved then.

3. Nested AGENTS.md:
   Use the AGENTS.md of a currently changing file from the closest parent folder.
   Parent files are defaults, and child files override only overlapping rules
   as per specs: https://agents.md

   All changing related files' parent folders should be scanned for AGENTS.md
   to know the specific instructions exactly for this file and its module.

4. If one file references another, then another file is with default rules
   and the current file can override it.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->
<!-- Priority: this block has LOWER precedence than the ## Nx Commands and ## Scaffolding sections above. If rules conflict, the sections above win. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- New apps and libs MUST be created only through Nx generators (e.g. `nx g @nx/js:library ...`). Do not create them by hand.
- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools.

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
