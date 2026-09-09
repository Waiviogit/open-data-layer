---
id: web-web-conventions
title: web — development conventions
description: "Actionable rules for `apps/web`. Full layering: architecture.md."
type: spec
status: active
scope: web
tags: [web, cross-cutting, conventions]
updated_at: 2026-06-10
related:
  - docs/apps/web/spec/overview.md
---

# web — development conventions

**Back:** [web overview](overview.md) · **Related:** [architecture](architecture.md), [images](images.md)

Actionable rules for `apps/web`. Full layering: [architecture.md](architecture.md).

## Env config

### Runtime vs build (GHCR / compose)

**Do not hardcode deployment-specific environment variables into the web image at Docker build time.** Values that differ per host (public origins, internal service URLs, `ODL_NETWORK`, notifications WebSocket URL, IPFS content base, JWT-related server secrets, etc.) must be supplied when the container runs — typically via compose `env_file` / `environment:` — not via `ARG` → `ENV` in the Dockerfile and not via `NEXT_PUBLIC_*` inlined at `next build`.

- **Server:** read at runtime in [`src/config/env.ts`](../../../apps/web/src/config/env.ts) (`server-only` + Zod) or dedicated `get-*.ts` helpers used from the root layout and server actions.
- **Client Components:** receive deploy-specific values from the **root layout** through context providers (e.g. `OdlNetworkProvider`, `NotificationsWsConfigProvider`, `IpfsContentBaseProvider`) or props from Server Components — **not** `process.env.NEXT_PUBLIC_*` for per-stack URLs.
- **New variable checklist:** Zod or `get-*` on server → wire `app/layout.tsx` if the UI needs it → `apps/web/.env.example` + root `.env.example` → compose `environment` for `web` (and other services as needed). No new `NEXT_PUBLIC_*` for deployment-specific settings.

Rare exception: static product defaults identical on every deployment (e.g. optional `NEXT_PUBLIC_HIVE_JSON_*` for local Hive `json_metadata`) — keep centralized and documented; not a substitute for runtime compose config.

### Centralized server env

- **`src/config/env.ts`** is the single place for server-side environment variables used by the web app. It uses **`import 'server-only'`** and **Zod** (`parse` at module load) so invalid configuration fails fast and Client Components cannot import it by accident.
- To add a variable: extend the Zod schema, use `env` in infrastructure or server-only code, document it in `apps/web/.env.example`, and add a row to [getting started](../../../getting-started.md) if it matters for local dev.
- Do not scatter `process.env` across `modules/` — keep discovery and validation centralized.
- **Public Hive metadata** (`NEXT_PUBLIC_HIVE_JSON_*` for `json_metadata` defaults): read only via [`src/config/hive-json-metadata-public.ts`](../../../apps/web/src/config/hive-json-metadata-public.ts) (`getHiveJsonMetadataDefaults()`), not ad hoc in modules.

## Placement

| You need | Put it in |
|----------|-----------|
| Server env variable (read in Node / Server Components / route handlers) | `src/config/env.ts` — Zod schema + `export const env`; add the key to `apps/web/.env.example`. Do **not** read `process.env` in feature modules. |
| `NEXT_PUBLIC_*` defaults for Hive `community` / `app` | `src/config/hive-json-metadata-public.ts` + `apps/web/.env.example` |
| Entity, value object, invariant | `modules/<name>/domain/` |
| “Can user X do Y?” rule | `modules/<name>/domain/policies/` |
| Read orchestration | `modules/<name>/application/queries/` |
| Write orchestration | `modules/<name>/application/use-cases/` |
| Zod schema for action/API input | `modules/<name>/application/dto/` |
| Fetch + map API to domain | `modules/<name>/infrastructure/` |
| Feature UI | `modules/<name>/presentation/` |
| `Result`, base errors | `shared/domain/` |
| `CurrentUser`, auth **port** | `shared/application/` |
| Design tokens / theme | [theme.md](theme.md) — not duplicated here |

## Imports

- Use `@/` alias → `apps/web/src/*`.
- Import feature code only from **`modules/<name>/index.ts`** (public API). **Never** deep-import `modules/foo/application/...` from outside that module.
- `domain/` must not import `infrastructure/`, `presentation/`, or Next.js app-only APIs (except where a file is explicitly server-only — prefer keeping domain free of Next).

## Server Component (`page.tsx`, layouts)

**May:** call query layer, read session via shared auth adapter, pass serializable props to children.

**Avoid:** large business rules inline; repeated permission checks — use **policies** and **queries** from the module.

## Server Action (`'use server'`)

**May:** parse/validate with Zod, call use case, `revalidatePath` / `revalidateTag`, return **serializable** `Result` (and validation errors).

**Avoid:** duplicating authorization rules — delegate to **use case** + **policy**. Avoid non-serializable returns (classes with methods, `Date` if you need stable JSON — prefer ISO strings in DTOs).

## Client Component

**May:** forms, local state, optimistic UI, call server actions, UI-only hooks.

**Avoid:** token refresh/cookie implementation details; direct business rules — use action results and props from the server.

## Queries vs use cases

- **Query:** read-only; optimized for UI; may return view-friendly DTOs if mapped in application.
- **Use case:** mutations and side effects; always runs policies and domain rules before persistence.

## Policies

- Prefer `policy.canUpdate(user, resource)` (or named methods) over scattered `if (user.role === ...)` in components.
- Policies are **pure** where possible (easy to unit test).

## Mappers

- **API response** → **domain** in infrastructure (or application boundary).
- **Domain** → **props/view model** in presentation or a dedicated mapper — do not leak API field names into domain entities.

## `Result<T, E>`

- Use for expected failures: `not_found`, `forbidden`, `validation_error`, etc.
- In presentation, switch on `result.ok` and, on failure, read `result.error` (type `E` may be a code union, object with `code`, etc.).
- Reserve `throw` for unexpected errors.

## Naming

- **Queries:** `*Query` or `get*Query` factory — match team preference but stay consistent per module.
- **Use cases:** `*UseCase` or `*Command` — one style per module.
- **Repositories:** interface in domain or application port; implementation `*RepositoryImpl` or `Api*Repository` in infrastructure.

## Barrel exports

- Each `modules/<name>/index.ts` exports only what other packages need.
- Add new exports deliberately — public API is a contract.

## Testing

- Domain and policies: **unit tests** without React/Next.
- Infrastructure: mock `fetch` or inject ports.
- Co-locate `*.spec.ts` next to source (see root `AGENTS.md`).

## Security headers

Baseline response headers are set in [`next.config.js`](../../../apps/web/next.config.js) for all routes: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, partial `Content-Security-Policy` (`frame-ancestors`, `object-src`, `base-uri`, `form-action`), and `Permissions-Policy` (camera/microphone off; geolocation same-origin for map panels).

Production HTTPS adds `Strict-Transport-Security` in [`nginx/conf.d/default.conf.template`](../../../nginx/conf.d/default.conf.template).

User-controlled external links must use [`safeHttpUrl`](../../../apps/web/src/shared/domain/safe-http-url.ts) (`http`/`https` only). On-chain widget HTML is sandboxed in [`ObjectWidgetContent`](../../../apps/web/src/modules/object/presentation/components/object-widget-content.tsx) — never inject into the parent document.

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx lint web` | Lint |
| `pnpm nx test web` | Tests |
