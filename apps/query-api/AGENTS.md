# query-api — agent rules

Specialization for this app. **Shared policy** (monorepo, NestJS layering, Kysely, logging, OpenAPI workflow where generic, testing, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md). Do not duplicate that here.

## Role

Read-focused HTTP API: NestJS with Express, **global prefix** `query`, **URI versioning** `v1`, Swagger via `openapi/setup-swagger`.

## Source layout

```
src/
  config/          env.validation.ts + query-api.config.ts
  database/        DatabaseModule, KYSELY token, Database type
  repositories/    RepositoriesModule + read-side repositories (no chain-indexer sync-queue repos)
  controllers/     ControllersModule + one controller per resource (no business logic)
  auth/            JWT guard, decorators, ownership guard
  http/            request decorators (viewer header, governance object id)
  pipes/           ZodBodyPipe, ZodQueryPipe
  openapi/         per-resource spec fragments + registry + generate script
  domain/          feature modules: governance/, objects/, users/, feed/, drafts/
```

## Request flow

`Controller` → **`ZodBodyPipe` / `ZodQueryPipe`** (when applicable) → **`*Endpoint.execute(...)`** → **repository** (and `GovernanceResolverService` where needed).

- Controllers must **not** embed business logic or call repositories directly for orchestration — use domain `*Endpoint` classes.
- Do **not** bypass the pipe layer for body/query validation when a pipe is the established pattern for that route.

## Naming: Endpoints vs services

- Query/use-case classes are named **`Get*Endpoint`**, **`Create*Endpoint`**, etc., with a single **`execute(...)`** method.
- Prefer **not** naming these `*Service` except where the codebase already uses a service for a cohesive sub-area (e.g. **`UserPostDraftsService`** in drafts).

## Governance

- **`GovernanceResolverService`** and shared snapshot helpers live under `domain/governance/`.
- Do **not** duplicate governance resolution logic inside controllers or endpoints — call the service/helpers.

## OpenAPI

- Every public HTTP surface should have a corresponding fragment under `openapi/` and registration in the registry.
- Prefer **spec-first fragments** over decorating controllers with Swagger decorators unless the project already standardizes otherwise.

## Modules

- Feature `*.module.ts` files import `RepositoriesModule` and, when needed, `GovernanceModule` and `@opden-data-layer/objects-domain` — follow existing modules as templates.

## Search deduplication by product group

`objects_core.meta_group_id` is maintained by `chain-indexer` (`MetaGroupSyncHandler`) and reflects the winning `group_id` update value for each object.

When building product search endpoints that must collapse variants into one result per group, use `DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))` ordered by `oc.weight DESC NULLS LAST` so the highest-weight representative is kept per group.

Objects without a `group_id` update each appear as their own group (`COALESCE` falls back to `object_id`).
