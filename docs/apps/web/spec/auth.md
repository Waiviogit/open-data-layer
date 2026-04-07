# web — authentication

**Back:** [web spec overview](overview.md) · **Related:** [architecture](architecture.md), [web-conventions](web-conventions.md)

## Overview

- **auth-api** (Nest) issues JWTs; **web** never calls auth-api from the browser directly for login.
- Next.js **route handlers** under `src/app/api/auth/*` proxy to `{AUTH_API_BASE_URL}/auth/v1/...` and set **httpOnly** cookies (`odl_access`, `odl_refresh`). `AUTH_API_BASE_URL` must be the **origin only** (no path segment).
- Server code resolves the current user via `createCookieAuthContextProvider()` using `jose` and `AUTH_JWT_SECRET` (must match auth-api `JWT_SECRET`).

## Module: `src/modules/auth`

Clean architecture: `domain` (wallet facade, provider metadata), `application` (ports, use cases), `infrastructure` (BFF client, Keychain/HiveSigner helpers, `DefaultWalletFacade`), `presentation` (login UI).

## Env

See `apps/web/.env.example`: `AUTH_API_BASE_URL`, `AUTH_JWT_SECRET`.

## Wallet facade

`WalletFacade` (`createWalletFacade`) exposes `login(provider, username)` and `broadcast` (placeholder until dhive broadcast is wired). Providers: Keychain, HiveAuth (manual `authData` step in UI), HiveSigner (redirect).
