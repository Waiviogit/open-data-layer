# auth-api — challenge and login flows

**Back:** [overview](../overview.md)

## Endpoints (base URL `{origin}/auth/v1`)

Global HTTP prefix is `auth` (see `apps/auth-api/src/main.ts`); controller routes are versioned under `v1`.

| Method | Path | Role |
|--------|------|------|
| POST | `/auth/v1/challenge` | Start login; returns `challengeId`, `message`, `expiresAt`; HiveSigner also returns `authorizeUrl`, `state` |
| POST | `/auth/v1/verify/keychain` | Verify Keychain `requestSignBuffer` signature against posting key |
| POST | `/auth/v1/verify/hiveauth` | Verify HiveAuth completion payload (`authData` JSON) |
| GET | `/auth/v1/callback/hivesigner` | OAuth callback: `code`, `state`; exchanges token, loads Hive account |
| POST | `/auth/v1/refresh` | Rotate tokens using refresh JWT |
| POST | `/auth/v1/logout` | Revoke refresh session |

## Keychain

1. Client requests `POST /auth/v1/challenge` with `{ provider: "keychain", username }`.
2. User signs `message` with Hive Keychain (Posting).
3. Client sends `POST /auth/v1/verify/keychain` with `challengeId`, `username`, `signature`, `signedMessage`.
4. Server verifies signature with `@hiveio/dhive`, marks challenge used, issues JWTs.

## HiveAuth

1. Client requests `POST /auth/v1/challenge` with `{ provider: "hiveauth", username }`.
2. User completes HAS + PKSA flow; client builds `authData` JSON with `username`, `expire` (unix seconds), and optional `challenge` matching server message.
3. Client sends `POST /auth/v1/verify/hiveauth` with `challengeId`, `username`, `authData`.

## HiveSigner

1. Client requests `POST /auth/v1/challenge` with `{ provider: "hivesigner", username }` (requires `HIVESIGNER_*` env).
2. Browser opens `authorizeUrl`; HiveSigner redirects to `HIVESIGNER_CALLBACK_URL` with `code` and `state`.
3. Backend `GET /auth/v1/callback/hivesigner` exchanges code, calls HiveSigner `/api/me`, issues JWTs.

## Protected APIs

Validate only the issued access JWT (and refresh chain revocation as needed). Do not accept HiveSigner or HAS tokens directly on domain APIs.
