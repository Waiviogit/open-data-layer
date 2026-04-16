# chain-indexer — agent rules

Specialization for this app. **Shared policy** (monorepo, NestJS layering, Kysely, logging, testing, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md). Do not duplicate that here.

## Role

Background indexer: NestJS **application context** only — **no HTTP server**, no controllers.

## Module wiring (reference)

`ConfigModule` → `EventEmitterModule` → `ScheduleModule` → `IpfsClientModule` → `RedisClientModule` → `HiveClientModule` → `DatabaseModule` → `RepositoriesModule` → `HiveParserModule` → `GovernanceModule` (see `main.module.ts`).

## Source layout

```
src/
  config/          env.validation.ts + chain-indexer.config.ts
  constants/       app-scoped constants (hive-parser, post-objects, thread-accounts)
  database/        DatabaseModule, KYSELY token, Database type
  repositories/    RepositoriesModule + repository classes (Kysely only, no business logic)
  domain/          feature areas: governance/, hive-parser/, hive-comment/, hive-social/, hive-vote/, odl-parser/
```

- Each `domain/<feature>/` has its own `*.module.ts`; use a barrel `index.ts` when the area exports a public surface.
- **Repositories**: single `RepositoriesModule` — register providers there; repositories are data access only (see root AGENTS.md).

## Workers

Files named `*.worker.ts`: long-running or periodic background work (queue draining, sync loops). Injectable Nest providers; **no HTTP**.

## ODL custom JSON

- **Handlers** implement `OdlActionHandler` (`action` + `handle(payload, ctx)`). Register in `OdlParserModule` / parser maps — **add new behavior with new handler classes**, not by growing orchestrators.
- **Guards** (`domain/odl-parser/guards/`): implement `WriteGuard`; register via the `WRITE_GUARDS` token and `WriteGuardRunner`. Add a new guard as a **new class**, not new branches in existing guards.

## Governance events

- Emit **`GovernanceObjectMutatedEvent`** (and constant `GOVERNANCE_OBJECT_MUTATED_EVENT`) via `EventEmitter2` when governance-related writes occur.
- Subscribers (e.g. cache invalidation) live in dedicated services — keep handlers thin.

## Cross-cutting

- **Hive block processing** uses `HiveProcessorModule` / parsers from `@opden-data-layer/core` — follow existing `hive-parser` and `odl-parser` patterns for new operations.
