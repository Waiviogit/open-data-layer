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

### Web app (`apps/web`) — Design tokens

When creating or editing UI in `apps/web`, follow the **design token** system so themes and future design presets stay swappable without scattered hex values.

- **Source of truth:** CSS custom properties per `[data-theme='…']` in [`apps/web/src/styles/theme.css`](apps/web/src/styles/theme.css); Tailwind maps them in [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js). Spec: [`docs/apps/web/spec/theme.md`](docs/apps/web/spec/theme.md).
- **Colors:** use semantic utilities (`bg-bg`, `text-fg`, `text-fg-secondary`, `text-fg-tertiary`, `text-fg-disabled`, `text-muted`, `text-link`, `border-border`, `bg-accent`, `text-accent-fg`, `bg-accent-hover`, `text-accent-alt`, `bg-secondary`, `text-secondary-fg`, `bg-tertiary`, `text-tertiary-fg`, `bg-error`, `text-error`, `border-error`, `outline-focus`, `bg-surface`, `bg-overlay`, `bg-ghost-surface`, `border-ghost-border`, `bg-surface-control`, extended tokens such as `border-border-strong`, `bg-surface-alt`, `bg-surface-raised`, `text-heading`, `bg-code-bg`, `bg-nav-bg`, `text-nav-fg`). Do **not** embed raw `#…` / `rgb()` / `rgba()` in component `className` or inline styles except where documented (e.g. temporary scaffold CSS).
- **Typography:** root uses `var(--font-body)` from `global.css`; prefer `font-body`, `font-display`, `font-editorial`, `font-label`, or `font-mono` when a component needs an explicit stack. Use `text-hero`, `text-display`, `text-section`, `text-body-lg`, `text-body`, `text-body-sm`, `text-caption`, `text-body-xs`, `text-micro`, `text-nano` for theme-controlled sizes; `font-weight-display`, `font-weight-body`, `font-weight-label`, `font-weight-strong` for weights; `tracking-display`, `tracking-body`, `tracking-caption`, `tracking-loose`, `tracking-looser` for letter-spacing; `leading-display`, `leading-body`, `leading-compressed`, `leading-editorial` for line-height.
- **Radius and elevation:** prefer token-backed utilities (`rounded-btn`, `rounded-card`, `rounded-card-lg`, `rounded-xl`, `rounded-pill`, `rounded-circle`, `shadow-card`, `shadow-card-float`, `shadow-card-warm`, `shadow-hover`, `shadow-ring`, `shadow-whisper`, `shadow-inset`, `shadow-focus-ring`) over default Tailwind `rounded-md` / `rounded-lg` / `shadow-sm` so curvature and depth follow the active theme. For glass navigation use `backdrop-filter: var(--backdrop-nav)` in CSS.
- **Layout rhythm:** prefer `px-gutter` / `sm:px-gutter-sm` for horizontal gutters, `py-section-y-sm`, `py-section-y`, `py-section-y-lg`, `py-section-y-hero` for vertical section spacing, `p-card-padding` / `gap-card-padding` for cards and grids, `max-w-container-page`, `max-w-container-content`, and `max-w-container-narrow` for widths — instead of ad-hoc `px-4`, `py-16`, `max-w-lg`, `max-w-6xl`.
- **New tokens:** if a design needs a new role (color, radius, shadow, layout), add the CSS variable in `theme.css` for every theme block, extend Tailwind in `tailwind.config.js`, and update `docs/apps/web/spec/theme.md` in the same change.

### Web app (`apps/web`) — Shell mode compatibility

Shell mode (`data-shell-mode` on `<html>`) adjusts structural tokens and optional profile/feed UI. Full spec: [`docs/apps/web/spec/shell-mode.md`](docs/apps/web/spec/shell-mode.md).

- **Imports:** use the [`@/shell-mode`](apps/web/src/shell-mode/index.ts) barrel only — do not deep-import `use-shell-mode` or other module files.
- **Behavior checks:** use helpers from `shell-mode-features.ts` (`shouldHideHero`, `shouldUsePostGrid`, `getVisibleMenuKeys`, `shouldCenterMenu`) instead of `resolvedMode === '…'`.
- **Visibility:** prefer CSS toggles (`.shell-hide-<mode>` / `.shell-show-<mode>` in `theme.css`) when the subtree is the same across modes; use JS (`return null` or conditional render) when component trees differ, the hidden subtree is heavy, or nav/data must be filtered.
- **Layout:** use `--shell-left-width`, `--shell-right-width`, and `--spacing-card` in grid templates so shell presets adjust widths without ad-hoc breakpoints.
- **New behavior:** add a helper in `shell-mode-features.ts` (and CSS in `theme.css` when needed), not scattered mode string checks in feature components.

### Web app (`apps/web`) — Images

- Use **`next/image`** for user-facing raster content (avatars, feed thumbnails, covers). Use inline SVG or `<img>` for icons and decorative graphics. Markdown/HTML body images may stay plain `<img>` with `loading="lazy"`. Spec: [`docs/apps/web/spec/images.md`](docs/apps/web/spec/images.md).

### Web app (`apps/web`) — Architecture

Feature code follows **clean architecture** in `apps/web`: **domain**, **application**, **infrastructure**, **presentation** inside `src/modules/<feature>/`; cross-cutting types in `src/shared/`. Full spec: [`docs/apps/web/spec/architecture.md`](docs/apps/web/spec/architecture.md). Rules for Server Components, server actions, imports, `Result`, policies: [`docs/apps/web/spec/web-conventions.md`](docs/apps/web/spec/web-conventions.md).

- **No runtime DI container** — compose with module barrel exports and factory functions; import from `@/modules/<name>` and `@/shared`.
- **Import only public APIs** — consume other feature modules via `modules/<name>/index.ts`, not deep paths.
- **Authentication vs authorization** — identity (session/cookies) is separate from **policies** (`canUpdate`, etc.); policies live in feature `domain/policies/`.
- **Queries vs use cases** — reads (`application/queries/`) vs writes (`application/use-cases/`); ports (interfaces) in domain/application, implementations in `infrastructure/`.
- **Typed `Result<T, E>`** — use for expected failures in server actions; see `apps/web/src/shared/domain/result.ts`.

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
- Never hardcode ad-hoc colors or ignore design-token utilities in `apps/web` UI — follow **Web app (`apps/web`) — Design tokens** (semantic Tailwind + `theme.css`).
- Never deep-import from `apps/web` feature modules — use each module's `index.ts` barrel only (see **Web app (`apps/web`) — Architecture**).

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
