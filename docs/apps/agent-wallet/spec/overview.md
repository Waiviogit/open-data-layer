---
id: docs-apps-agent-wallet-spec-overview
title: agent-wallet
description: Local signing daemon with optional HAS and MCP tools for agent-driven ODL broadcasts.
type: overview
status: active
scope: agent-wallet
tags: [agent-wallet, has, mcp, overview]
updated_at: 2026-08-20
related:
  - docs/skills/hive-has-agent-wallet.md
  - docs/skills/osl-messaging.md
  - docs/skills/wallet-delegation-swap-for-agents.md
  - docs/skills/hive-account-authority-for-agents.md
  - docs/skills/hive-blockchain-broadcast.md
  - docs/apps/knowledge-api/spec/overview.md
---

# agent-wallet

Local NestJS app: loads Hive accounts from a registry (`accounts.json` or env), signs with local keys and/or an optional HiveAuth (HAS) session, and exposes MCP tools for Waivio auth, ODL build/broadcast, and notifications.

## Agent first visit

1. Skill: [hive-has-agent-wallet](../../skills/hive-has-agent-wallet.md)
2. Download `agent-wallet.js` from [GitHub Releases](https://github.com/Waiviogit/open-data-layer/releases) (or `pnpm nx serve agent-wallet` from monorepo checkout)
3. Read bearer token from `~/.odl/agent-wallet.token`
4. Register agent-wallet as an MCP server — [mcp-client-setup.md](mcp-client-setup.md) (preferred). Raw JSON-RPC is the fallback — [hive-has-agent-wallet skill](../../skills/hive-has-agent-wallet.md#fallback-raw-json-rpc).

## Distribution

| Channel | Use when |
|---------|----------|
| **GitHub Release** (`agent-wallet.js`) | Default for end users and sidecar agents without a repo checkout |
| **Monorepo** (`pnpm nx serve agent-wallet`) | Local development or agent already has a checkout |

CI publishes a **portable archive** (`agent-wallet-portable.tar.gz`: `main.js`, pruned `package.json`, lockfile, install scripts) via [release-agent-wallet workflow](../../../.github/workflows/release-agent-wallet.yml) on tag `agent-wallet-v*`. Run `install.sh` / `install.ps1` on the target machine to install native production deps (`@hiveio/dhive`, `secp256k1`).

**Do not** add `agent-wallet` to server `docker-compose.*.yml` files. It is a per-user localhost daemon with HAS session secrets — hosting it behind nginx would expose signing to the network and break the `127.0.0.1`-only security model.

## Stack

- NestJS, `@modelcontextprotocol/sdk` Streamable HTTP (stateless MCP per request)
- `@opden-data-layer/hive-auth` — `HasClient`
- `@opden-data-layer/hive-broadcast` — `buildObjectCreateEnvelope`
- `@opden-data-layer/hive-memo-crypto` — memo encrypt/decrypt; wired via `osl_memo_*` MCP tools ([osl-messaging skill](../../skills/osl-messaging.md))
- Default bind **`127.0.0.1:7500`** — no CORS

## Feature specs

| Feature | Doc |
|---------|-----|
| MCP client registration (Cursor, Claude, Codex, Hermes) | [mcp-client-setup.md](mcp-client-setup.md) |
| Multi-account local keys, Waivio tokens, signer resolution | [multi-account.md](multi-account.md) |
| HAS agent wallet (MCP tools, session, security) | [hive-has-agent-wallet skill](../../skills/hive-has-agent-wallet.md) |
| OSL messaging (read/send/encrypt/notify) | [osl-messaging skill](../../skills/osl-messaging.md) |
| Wallet delegations / balances / swaps | [wallet-delegation-swap-for-agents skill](../../skills/wallet-delegation-swap-for-agents.md) |
| Hive posting authority / act-as grantor | [hive-account-authority-for-agents skill](../../skills/hive-account-authority-for-agents.md) |
| HAS login from chat (Telegram, Slack) | [has-login-from-chat skill](../../skills/has-login-from-chat.md) |
| IPFS image upload + avatar/gallery policy | [ipfs-image-upload skill](../../skills/ipfs-image-upload.md) |
| IPFS file upload + ODL batch import | [ipfs-file-upload skill](../../skills/ipfs-file-upload.md) |

## MCP tools

| Tool | Returns |
|------|---------|
| `has_login_start` | `requestId`, `alreadyActive`, `expiresAt`, `expiresInSec`, `pushSent`, `webLink` (compact fragment), `deepLink` only when no web link is configured |
| `has_login_status` | `pending` (with `account`, `expiresInSec`, `webLink`) / `active` / `rejected` / `expired` |
| `has_login_qr` | `deepLink`, `qrAscii`, optional `qrPngPath` for a pending login — terminal and second-device fallback only |
| `has_session` | `account`, `expiresAt` (no secrets) |
| `has_logout` | — |
| `odl_build_object_create` | `ops`, `opsCount`, `bytes`, `warnings`, `suggestIpfsBatch`, `requiresIpfsBatch`, `envelopeJson?` — **new objects only** |
| `odl_build_update_create` | `ops`, `opsCount`, `bytes`, `requiresIpfsBatch`, `envelopeJson?` — single `update_create` for existing object |
| `odl_build_batch_import` | `ops`, `opsCount`, `bytes` — one `batch_import` op for an IPFS CID |
| `odl_build_gallery_item` | `ops`, `opsCount`, `bytes` — gallery item (+ album ensure when needed) |
| `hive_build_post` | `ops`, `opsCount: 2`, `json_metadata`, `warnings` — root Hive post (`comment` + `comment_options`); `author` may be a grantor |
| `hive_build_posting_authority_grant` | `ops`, `keyType: active`, `signerAccount`, `canSignLocally`, `warnings` — grant/revoke posting `account_auths` |

Leo object threads (Reviews > Threads) are **not** built by agent-wallet — see [hive-thread-create skill](../../skills/hive-thread-create.md): agents hand-build one `comment` op and broadcast via `wallet_broadcast`.

| `has_broadcast` | `requestId` |
| `has_broadcast_status` | `signed` / `rejected` / `error` / `expired`, `transactionId` |
| `wallet_accounts` | configured accounts with key/Waivio/notifications readiness (no secrets) |
| `wallet_status` | signing mode, HAS/Waivio/local readiness, `localAccounts[]` (no secrets) |
| `waivio_auth_start` / `waivio_auth_status` / `waivio_auth_logout` | Waivio JWT session per account (optional `account`) |
| `ipfs_upload_image` | `{ cid, url? }` after authenticated upload (optional `account`; max 50 MiB) |
| `ipfs_upload_file` | `{ cid }` — ODL envelope JSON via `/upload/file` (optional `account`; max 10 MiB) |
| `wallet_broadcast` / `wallet_broadcast_status` | mode-aware broadcast (HAS or local keys; optional `account` signer) |
| `osl_build_channel_create` | group / object `channel_create` envelope |
| `osl_build_message_create` | plaintext `message_create` |
| `osl_build_encrypted_message_create` | encrypted `message_create` (local memo only) |
| `osl_memo_encrypt` / `osl_memo_decrypt` | memo crypto helpers |
| `notifications_pull` / `notifications_status` | WS notification bridge for inbound messaging |
| `hive_build_hp_delegation` | `ops`, `keyType: active`, `warnings` — HP delegate/undelegate |
| `hive_build_rc_delegation` | `ops`, `keyType: posting`, `warnings` — RC delegate/remove (`maxRc: 0`) |
| `engine_build_token_delegation` | `ops`, `keyType: active`, `warnings` — WAIV/Engine delegate/undelegate |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7500` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address |
| `ODL_NETWORK` | `testnet` | `mainnet` \| `testnet` → `odl-mainnet` / `odl-testnet` for ODL ops; `osl-mainnet` / `osl-testnet` for OSL messaging tools |
| `HAS_WS_URL` | `wss://hive-auth.arcange.eu` | HAS WebSocket server |
| `HAS_APP_NAME` | `ODL Agent` | Shown in Keychain auth prompt |
| `HAS_WEB_LINK_BASE` | `https://waiviodev.com` | Origin for clickable `webLink` (`/has#<compact fragment>`); empty disables |
| `WAIVIO_API_ORIGIN` | `https://waiviodev.com` | Base for `/auth/v1` and `/ipfs-gateway` |
| `AGENT_WALLET_SIGNING_MODE` | `has` | `has` \| `local` — tie-break when `wallet_broadcast` has no `account` |
| `AGENT_WALLET_ACCOUNTS_FILE` | `<dataDir>/accounts.json` | JSON registry of local signing accounts |
| `HIVE_ACCOUNT` | — | **Fallback** when accounts file missing/unreadable |
| `HIVE_POSTING_KEY` | — | **Fallback** posting WIF (never persisted) |
| `HIVE_ACTIVE_KEY` | — | **Fallback** optional active WIF |
| `HIVE_MEMO_KEY` | — | **Fallback** optional memo WIF |
| `HIVE_OWNER_KEY` | — | **Fallback** optional owner WIF (readiness only; never used for broadcast) |
| `NOTIFICATIONS_WS_URL` | derived from `WAIVIO_API_ORIGIN` | Notifications WS for inbound message push |
| `HIVE_RPC_NODES` | `https://api.hive.blog` | Comma-separated Hive RPC URLs |
| `AGENT_WALLET_DATA_DIR` | `~/.odl` | MCP token + HAS + Waivio refresh session files |
| `AGENT_WALLET_NO_PERSIST` | `false` | Memory-only session when `true` |
| `AGENT_WALLET_BEARER_TOKEN` | — | Fixed token (optional; else auto-generated) |

## Health

`GET /agent-wallet/health` → `{ status, wallet: { signingMode, hasSession, waivioAuth, localKeys } }` (no secrets)

Credential files (when persistence enabled):

| File | Contents |
|------|----------|
| `~/.odl/agent-wallet.token` | MCP bearer only |
| `~/.odl/agent-wallet-session.json` | HAS session only |
| `~/.odl/accounts.json` | Local Hive WIF keys (preferred over env) |
| `~/.odl/waivio-auth/<account>.json` | Waivio refresh token per account |

## Verification

```bash
pnpm nx test agent-wallet
pnpm nx e2e agent-wallet-e2e
pnpm check:bundle-deps -- --app agent-wallet
pnpm nx serve agent-wallet   # dev only
```

E2E uses in-process fake HAS WebSocket server; real Keychain flow is manual per skill.
