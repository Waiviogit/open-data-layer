# web — authentication

**Back:** [web spec overview](overview.md) · **Related:** [architecture](architecture.md), [web-conventions](web-conventions.md)

## Overview

- **auth-api** (Nest) issues JWTs; **web** never calls auth-api from the browser directly for login.
- Next.js **route handlers** under `src/app/api/auth/*` proxy to `{AUTH_API_BASE_URL}/auth/v1/...` and set **httpOnly** cookies (`odl_access`, `odl_refresh`). `AUTH_API_BASE_URL` must be the **origin only** (no path segment).
- Server code resolves the current user via `createCookieAuthContextProvider()` using `jose` and `AUTH_JWT_SECRET` (must match auth-api `JWT_SECRET`).
- **Silent refresh:** `src/proxy.ts` runs before RSC on each matched request. If `odl_access` is missing or expired but `odl_refresh` is valid, web calls auth-api `POST /auth/v1/refresh` and sets new httpOnly cookies (up to refresh TTL, default 7d). Skips `/api/auth/*` to avoid refresh loops. Manual refresh remains `POST /api/auth/refresh`.

## Module: `src/modules/auth`

Clean architecture: `domain` (wallet facade, provider metadata), `application` (ports, use cases), `infrastructure` (BFF client, Keychain/HiveSigner helpers, `DefaultWalletFacade`), `presentation` (login UI).

## Env

See `apps/web/.env.example`: `AUTH_API_BASE_URL`, `AUTH_JWT_SECRET`, `ODL_NETWORK` / `NEXT_PUBLIC_ODL_NETWORK`.

## Wallet facade

`WalletFacade` (`createWalletFacade`) exposes `login(provider, username)`, `broadcast`, and **`setActiveProvider(provider | null)`** (restore active signer without re-login).

- **Browser singleton:** `getWalletFacade()` (`infrastructure/wallet-facade.client.ts`) shares one facade + BFF client across the app. After a **full page reload**, the cookie session is still valid but the in-memory `activeProvider` is lost; successful Keychain login stores `'keychain'` in **`sessionStorage`** (`ODL_WALLET_PROVIDER_SESSION_KEY`). Client code calls **`useHydrateWalletProvider()`** to read `sessionStorage` and `setActiveProvider('keychain')` so `broadcast` works after refresh. **HiveSigner / HiveAuth** hydration is not implemented yet.
- **Operations:** Domain builders (`buildVoteOp`, `buildCommentOp`, `buildCommentOptionsOp`, `buildCustomJsonOp`, `buildReblogOp`) produce a normalized `BroadcastTransactionInput` (`HiveOperationPayload`).
- **ODL `custom_json`:** Use **`buildOdlCustomJsonOp`** from `@/modules/auth` for ODL envelope broadcasts. It sets Hive `custom_json.id` from **`NEXT_PUBLIC_ODL_NETWORK`** (`mainnet` → `odl-mainnet`, `testnet` → `odl-testnet`) — must match **chain-indexer** `ODL_NETWORK` on the same stack. Server code: `env.odlCustomJsonId` from `@/config/env`.
- **Signing:** `DefaultWalletFacade` dispatches to an `IHiveSigner` for the active provider. Keychain uses `hive_keychain.requestBroadcast`; HiveSigner and HiveAuth signers are stubs until wired.
- **Providers:** Keychain, HiveAuth (manual `authData` step in UI), HiveSigner (redirect).

### `json_metadata` and comment + `comment_options`

- Build the JSON string for `comment.json_metadata` with `@/shared` helpers: `buildHiveJsonMetadata` / `stringifyHiveJsonMetadata` (or `buildHiveJsonMetadataString`). Pass `host` from the browser (`window.location.host`) or from the request (`headers().get('host')`). Defaults for `community` and `app`: `getHiveJsonMetadataDefaults()` from `@/config/hive-json-metadata-public` (see `apps/web/.env.example` for `NEXT_PUBLIC_HIVE_JSON_*`).
- A comment with payout options is usually **two operations** in one broadcast: `buildCommentOp({ ..., json_metadata })` then `buildCommentOptionsOp({ ..., percent_hbd?, extensions: [buildCommentOptionsBeneficiaryExtension([...])] })`.
