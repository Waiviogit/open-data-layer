---
id: web-auth
title: web — authentication
description: "- **auth-api** (Nest) issues JWTs; **web** never calls auth-api from the browser directly for login. - Next.js **route handlers** under `src/app/api/auth/*` proxy to `{AUTH_API_BASE_URL}/auth/v1/...` and set **httpOnly** cookies (`odl_access`, `odl_refresh`). `AUTH_API_BASE_URL` must be the **origin only** (no path segment). - Server code resolves the current user via `createCookieAuthContextProvider()` using `jose` and `AUTH_JWT_SECRET` (must match auth-api `JWT_SECRET`). - **Silent refresh:**…"
type: spec
status: active
scope: web
tags: [web, auth]
updated_at: 2026-09-11
related:
  - docs/apps/web/spec/overview.md
  - docs/apps/web/spec/web-conventions.md
---

# web — authentication

**Back:** [web spec overview](overview.md) · **Related:** [architecture](architecture.md), [web-conventions](web-conventions.md)

## Overview

- **auth-api** (Nest) issues JWTs; **web** never calls auth-api from the browser directly for login.
- Next.js **route handlers** under `src/app/api/auth/*` proxy to `{AUTH_API_BASE_URL}/auth/v1/...` and set **httpOnly** cookies (`odl_access`, `odl_refresh`). `AUTH_API_BASE_URL` must be the **origin only** (no path segment).
- Server code resolves the current user via `createCookieAuthContextProvider()` using `jose` and `AUTH_JWT_SECRET` (must match auth-api `JWT_SECRET`).
- **Silent refresh:** `src/proxy.ts` runs before RSC on each matched request. If `odl_access` is missing or expired but `odl_refresh` is valid, web calls auth-api `POST /auth/v1/refresh` and sets new httpOnly cookies (up to refresh TTL, default 7d). Skips `/api/auth/*` to avoid refresh loops. Parallel requests coalesce refresh (in-flight dedup); a failed refresh **does not** clear cookies while the refresh JWT is still cryptographically valid (avoids rotation races wiping `odl_*` cookies). Manual refresh remains `POST /api/auth/refresh`.

## Module: `src/modules/auth`

Clean architecture: `domain` (wallet facade, provider metadata), `application` (ports, use cases), `infrastructure` (BFF client, Keychain/HiveSigner helpers, `DefaultWalletFacade`), `presentation` (login UI).

## Env

See `apps/web/.env.example`: `AUTH_API_BASE_URL`, `AUTH_JWT_SECRET`, `ODL_NETWORK` (repo root `.env` on compose), `HAS_WS_URL`, `HAS_APP_NAME`.

## Credential layers

Three independent credentials — **do not conflate JWT access token with HAS session token**:

| Layer | Storage | Used for | Must not |
|-------|---------|----------|----------|
| **App JWT** | httpOnly `odl_access`, `odl_refresh` | Server auth, BFF, query-api | Never in `localStorage` / JS |
| **HAS signing session** | `odl_hiveauth_session` | `HAS.authenticate` / `HAS.broadcast` only | Never sent to auth-api verify |
| **HiveSigner OAuth** | `odl_hs_token` (+ short-lived callback cookie) | HiveSigner SDK | Separate from HAS |

HAS session shape (`HasAuthSession`): `username`, `key` (auth_key), `expire` (ms), `hasSessionToken` (PKSA token from auth_ack), `host`. Verify payload is only `{ username, expire, challenge }` — no `key` or `hasSessionToken`.

**Security:** `auth_key` and `hasSessionToken` live in client storage (legacy Waivio Cookie parity). XSS could exfiltrate signing session; JWT remains httpOnly-protected.

**Dual storage:** `odl_hiveauth_session` is written to both `localStorage` (reload persistence) and `sessionStorage` (private/incognito mode where localStorage may fail).

**Session expiry:** Expired HAS sessions are auto-cleared on read. Broadcast and hydration require `expire > Date.now()`. Re-login via Keychain when expired.

## Hive Keychain routing (extension vs mobile)

The login UI exposes a single **Hive Keychain** provider. At sign-in time:

| Environment | Flow |
|-------------|------|
| Browser with Keychain extension (`window.hive_keychain.requestSignBuffer`) | Server challenge (`provider: keychain`) → extension `requestSignBuffer` → `verify/keychain` |
| Mobile browser or desktop **without** extension | Server challenge (`provider: hiveauth`) → **HiveAuth (HAS)** WebSocket → QR code + `has://auth_req/…` deep link → Keychain Mobile approval → `verify/hiveauth` |

Implementation: `shouldUseKeychainHas()` (`domain/device/`) forces HAS on mobile even when Keychain injects a stub extension API; `authenticateWithHas()` (`infrastructure/providers/has/`), `KeychainHasLoginPanel` (client-side QR via `qrcode` — never third-party QR APIs for auth payloads). Broadcasts prefer a valid `odl_hiveauth_session` via `resolveBroadcastProvider()`.

After HAS login, JWT session uses provider **`hiveauth`**; the HAS session is stored in `odl_hiveauth_session` for **`HAS.broadcast`** signing. **`useHydrateWalletProvider()`** restores `hiveauth` only when the session is still valid (not expired).

Extension login clears any stale HAS session. Logout clears `odl_hiveauth_session` via `clearWalletSession()`.

Default **`HAS_WS_URL`**: `wss://hive-auth.arcange.eu` (with fallback to `wss://has.hiveauth.com`). The deep link `host` field always matches the server the app actually connected to.

**iOS note:** Keychain Mobile may not sign in the background on iOS; keep the app open when approving broadcasts.

**HAS broadcast approval UI:** When `HAS.broadcast` receives `sign_wait`, [`HasSignWaitProvider`](apps/web/src/modules/auth/presentation/components/has-sign-wait-provider.tsx) opens a global modal instructing the user to approve in the Hive Keychain mobile app (no QR — desktop sessions linked via Hive Auth QR at login receive a push notification). The user can dismiss the modal with Cancel or the header close control while waiting; it closes automatically on success. On failure it shows the error and a Close button.

## Wallet facade

`WalletFacade` (`createWalletFacade`) exposes `login(provider, username)`, `broadcast`, and **`setActiveProvider(provider | null)`** (restore active signer without re-login).

- **Browser singleton:** `getWalletFacade()` (`infrastructure/wallet-facade.client.ts`) shares one facade + BFF client across the app. After a **full page reload**, the cookie session is still valid but the in-memory `activeProvider` is lost; **`useHydrateWalletProvider()`** restores Keychain, HiveSigner, or HiveAuth (HAS session) from `localStorage`.
- **Operations:** Domain builders (`buildVoteOp`, `buildCommentOp`, `buildCommentOptionsOp`, `buildCustomJsonOp`, `buildReblogOp`) produce a normalized `BroadcastTransactionInput` (`HiveOperationPayload`).
- **ODL `custom_json`:** Client broadcasts use **`useOdlCustomJsonId()`** (runtime **`ODL_NETWORK`** via root layout). `mainnet` → `odl-mainnet`, `testnet` → `odl-testnet` — same **`ODL_NETWORK`** as **chain-indexer**. Docker: one repo-root **`.env`** at container start only (no build-time ODL env on the image).
- **Signing:** `DefaultWalletFacade` dispatches to an `IHiveSigner` for the active provider. **HiveSigner** sessions always use the HiveSigner signer — Keychain is never tried when `activeProvider` is `hivesigner`, even if the Keychain extension is installed. For Keychain/HAS sessions on desktop, the facade may try the injected Keychain extension before falling back to HAS broadcast. Keychain uses `hive_keychain.requestBroadcast` with **Active** key for Hive Engine `custom_json`. HiveSigner: posting-key ops via SDK; active-key ops redirect to a HiveSigner `/sign/{op}` URL. Nested query fields are **JSON-encoded** (`account_update` `posting`/`active` authorities, `custom_json` auth arrays) — `hivesigner.sign()` would stringify objects as `[object Object]`. **HiveAuth** uses `HAS.broadcast` via `createHiveAuthSigner()` (requires valid `odl_hiveauth_session`).
- **Providers:** Keychain (extension or HAS fallback), HiveSigner (redirect). HiveAuth is used internally for mobile Keychain login and broadcast — not shown as a separate login row.

### `json_metadata` and comment + `comment_options`

- Build the JSON string for `comment.json_metadata` with `@/shared` helpers: `buildHiveJsonMetadata` / `stringifyHiveJsonMetadata` (or `buildHiveJsonMetadataString`). Pass `host` from the browser (`window.location.host`) or from the request (`headers().get('host')`). Defaults for `community` and `app`: `getHiveJsonMetadataDefaults()` from `@/config/hive-json-metadata-public` (see `apps/web/.env.example` for `NEXT_PUBLIC_HIVE_JSON_*`).
- A comment with payout options is usually **two operations** in one broadcast: `buildCommentOp({ ..., json_metadata })` then `buildCommentOptionsOp({ ..., percent_hbd?, extensions: [buildCommentOptionsBeneficiaryExtension([...])] })`.
