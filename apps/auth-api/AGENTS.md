# auth-api — agent rules

Specialization for this app. **Shared policy** (monorepo, NestJS layering, Kysely, logging, testing, Nx) lives in the repo root [`AGENTS.md`](../../AGENTS.md). Do not duplicate that here.

## Role

Hive authentication HTTP API: challenge/response, HiveAuth, HiveSigner OAuth callback, JWT access and refresh sessions. **No OpenAPI/Swagger** in this app.

- **Global prefix:** `auth`
- **URI versioning:** default `v1` (e.g. `http://localhost:<PORT>/auth/v1/...`)
- **CORS:** enabled with `origin: true`; allows `Content-Type`, `Authorization`, `Accept-Language`, `X-Locale`

## Module wiring (reference)

`ConfigModule` → `DatabaseModule` → `AuthDomainModule` → `ControllersModule` (see `main.module.ts`).

## Source layout

```
src/
  config/          env.validation.ts + auth-api.config.ts
  controllers/     AuthController + Zod request schemas (auth.schemas.ts)
  database/        DatabaseModule, KYSELY_AUTH token, AuthDatabase types
  domain/          domain services by area (see below)
  pipes/           ZodBodyPipe
  repositories/    ChallengesRepository, IdentitiesRepository, RefreshSessionsRepository
  utils/           parse-duration and other small helpers
```

## Domain areas

| Folder | Responsibility |
|--------|----------------|
| `challenge/` | Create server challenges (and HiveSigner authorize URL when applicable) |
| `verify/` | Verify Keychain signatures (`verify-keychain`) and HiveAuth payloads (`verify-hiveauth`) |
| `session/` | Issue tokens, refresh sessions, logout / revoke |
| `callback/` | HiveSigner OAuth code exchange |
| `token/` | JWT signing + verification (`TokenModule` + `TokenService`) |
| `providers/` | Hive chain client (e.g. posting public key lookup) |

## Request flow

`AuthController` → **`ZodBodyPipe`** (where used) → **domain service** → **repository**.

- Controllers must not contain business logic.
- Validate bodies with Zod schemas; keep parsing in `controllers/auth.schemas.ts` or co-located schemas.

## Authentication flows

- **Hive Keychain:** persisted challenge + ECDSA signature against posting key from chain (`HiveNodeService` + dhive crypto).
- **HiveAuth:** validate `authData` (Zod) + challenge match and expiry; no chain signature in this path.
- **HiveSigner:** OAuth redirect + callback; exchange code, fetch `/api/me`, then issue session via `HivesignerCallbackService`.

Add new behavior with **new classes** or small modules — do not grow orchestrators into god services.

## JWT

- **`TokenService`** issues access tokens (`typ: 'access'`) and refresh tokens (`typ: 'refresh'`).
- Refresh tokens carry **`jti`** aligned with the `refresh_sessions` row id.
- Config: `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` (see `env.validation.ts`).

## Database

- Inject **`KYSELY_AUTH`** (not `KYSELY` used in other apps). Tables: `auth_challenges`, `auth_identities`, `refresh_sessions` (see `database/types.ts`).
- **Redis** may appear in env validation; **this app persists auth state in Postgres only** — do not assume Redis is wired unless you add explicit usage.

## HTTP surface

- There are **no Nest guards** on routes today — security is enforced inside services (challenge validation, JWT verification on refresh/logout, etc.).
- If you add a guard or public route, document it explicitly and keep auth checks in one place.
