# AGENTS.md

Nx monorepo: NestJS apps with Postgres, Redis, Hive, or other runtimes as needed. All changes must be production-ready.

## General Principles

- Prefer simplicity over cleverness.
- Avoid premature abstraction.
- Keep modules loosely coupled.
- Prefer explicit over implicit behavior.
- Prefer small, focused functions.
- Prefer composition over inheritance (except when extending a shared repository base class).
- Avoid deep nesting — prefer early returns.
- Avoid magic numbers — use constants.
- No dead or commented-out code. Comments in English only.
- Do not introduce breaking changes silently. Keep commits focused.
- Update types when modifying contracts. Do not commit `.env` files or secrets.

## Project Context

- `apps/` — runnable NestJS applications (e.g. `chain-indexer`, `query-api`).
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

### Error Handling

- Repository base class catches and logs errors; returns `null` / empty arrays.
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

### Code Style

- ESLint flat config (`eslint.config.mjs`) with typescript-eslint + Prettier.
- Prettier: single quotes, trailing commas (all), auto endOfLine.
- Use descriptive names.

### Testing

- Jest with `ts-jest`. Unit tests: `*.spec.ts` co-located with source.
- E2E tests: separate Nx project `apps/<app>-e2e/src/`.
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

### nx_docs Usage

- Use for: advanced config, unfamiliar flags, migration guides, plugin config, edge cases.
- Do not use for: basic generator syntax, standard commands.

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

- **Where to read:** Start at [`docs/README.md`](docs/README.md). Domain specs: [`docs/spec/README.md`](docs/spec/README.md). Per-app docs: [`docs/apps/<app>/`](docs/apps/).
- **Architecture:** [`docs/architecture/overview.md`](docs/architecture/overview.md), ADRs under [`docs/architecture/adr/`](docs/architecture/adr/).
- **Writing rules:** [`docs/standards/docs-standards.md`](docs/standards/docs-standards.md).
- **One description, one place** — do not duplicate prose; cross-link with relative Markdown paths.
- **Missing spec** — if you add behavior and no spec exists, add or extend a doc under `docs/spec/` or `docs/apps/<app>/spec/` in the same change.
- **Spec vs code** — if implementation diverges from the spec, update the spec or mark explicitly: `> **TODO: spec–code divergence**`.
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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

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
