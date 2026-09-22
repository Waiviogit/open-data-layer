---
description: Read-path query-api NestJS app with OpenAPI and MCP agent mirror at POST /query/mcp.
globs: apps/query-api/src/**
alwaysApply: false
---

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
  mcp/             MCP Streamable HTTP (`POST /query/mcp`) + tool registrations
  domain/          feature modules: governance/, objects/, users/, feed/, drafts/, categories/
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

## MCP

- **Endpoint:** `POST /query/mcp` (Streamable HTTP, stateless, no URI version).
- **Instructions:** `src/mcp/mcp-instructions.ts` — enriched first-visit workflow (live data vs knowledge-api).
- **Catalog:** `src/mcp/mcp-tool-catalog.ts` — single source of truth for tool metadata; add an entry before `registerTool`.
- **Resources:** `register-query-mcp-resources.ts` — `odl-query://routing`, `odl-query://catalog/tools`, prompt `first_visit`.
- Every new HTTP controller **must** be mirrored as MCP tools in `src/mcp/tools/<resource>.tools.ts` and registered via `register-all-tools.ts`.
- **Exception:** `UserPostDraftsController` (JWT-authenticated writes) — do **not** expose via MCP.
- MCP tools must **not** contain business logic — delegate to the same `*Endpoint.execute()` methods used by HTTP controllers.
- Register context params as optional tool arguments where HTTP routes use headers:
  - `locale` (default `en-US`) — replaces `Accept-Language` / `X-Locale`
  - `viewer` — replaces `X-Viewer`
  - `governance_object_id` — replaces `X-Governance-Object-Id`
- Reuse domain Zod schemas for tool `inputSchema` (add `.describe()` on fields; extend with `withMcpLocaleContext` in `mcp-tool.helpers.ts`).
- Use `catalogDescription(name)` for tool `description` strings.
- MCP is not REST — do **not** add OpenAPI fragments for `/query/mcp`.
- Spec: `docs/apps/query-api/spec/mcp.md`; routing skill: `docs/skills/query-api-mcp-routing.md`.

## Account avatars

Do not parse `profile_image` inline. Use `avatarUrlFromJoinedAccountRow` (`apps/query-api/src/domain/users/resolve-avatar-url-from-hive-metadata.ts`): posting metadata, then `json_metadata`, then the `profile_image` column. Several accounts: `loadAccountAvatarUrls`. Profile's live chain metadata is the only extra input, and it goes through the same function. See root [`AGENTS.md`](../../AGENTS.md#account-avatars).

## Modules

- Feature `*.module.ts` files import `RepositoriesModule` and, when needed, `GovernanceModule` and `@opden-data-layer/objects-domain` — follow existing modules as templates.

## Search deduplication by product group

`objects_core.meta_group_id` is maintained by `chain-indexer` (`MetaGroupSyncHandler`) and reflects the winning `group_id` update value for each object.

When building product search endpoints that must collapse variants into one result per group, use `DISTINCT ON (COALESCE(oc.meta_group_id, oc.object_id))` ordered by `oc.weight DESC NULLS LAST` so the highest-weight representative is kept per group.

Objects without a `group_id` update each appear as their own group (`COALESCE` falls back to `object_id`).
