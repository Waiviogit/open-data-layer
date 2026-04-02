# web — development conventions

**Back:** [web overview](overview.md) · **Related:** [architecture](architecture.md)

Actionable rules for `apps/web`. Full layering: [architecture.md](architecture.md).

## Placement

| You need | Put it in |
|----------|-----------|
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

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx lint web` | Lint |
| `pnpm nx test web` | Tests |
