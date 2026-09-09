---
id: docs-skills-hive-blockchain-broadcast
title: Hive blockchain broadcast (ODL)
description: Build, sign, and broadcast Hive and ODL custom_json transactions using repo libraries and registries.
type: skill
status: active
scope: platform
tags: [hive, broadcast, odl, custom_json, dhive, signing, object-create]
updated_at: 2026-06-10
related:
  - docs/skills/knowledge-api-routing.md
  - docs/skills/hive-has-agent-wallet.md
  - docs/skills/osl-messaging.md
  - docs/skills/wallet-delegation-swap-for-agents.md
  - docs/skills/hive-post-create.md
  - docs/skills/hive-account-authority-for-agents.md
  - docs/skills/hive-account-signup.md
  - docs/skills/setup-workspace.md
  - docs/skills/obl-offers-contracts.md
  - docs/skills/obl-ledger.md
  - docs/skills/obl-disputes.md
  - docs/spec/README.md
  - docs/apps/web/spec/object-create-broadcast.md
  - docs/apps/chain-indexer/spec/odl-pipeline.md
---

# Hive blockchain broadcast (ODL)

Build, sign, and broadcast Hive transactions for **ODL** (`custom_json` envelopes) and standard Hive ops using this repo's libraries and registries.

**Prerequisite:** an existing Hive account — see [Hive account signup](hive-account-signup.md).

## When to use

- Create or update ODL objects on chain (`object_create`, `update_create`, votes, authority, follow, …).
- Broadcast standard Hive ops (vote, comment, follow, reblog) that the web app uses.
- Agent needs to know **which update types** an object type supports and **how to shape payloads**.

## When not to use

- Account signup — [hive-account-signup.md](hive-account-signup.md).
- Read-only queries — use **query-api** / Postgres (indexed state), not broadcast.
- **OBL business lifecycle** (offers, contracts, invoices, payments, disputes) — use [obl-offers-contracts](obl-offers-contracts.md), [obl-ledger](obl-ledger.md), [obl-disputes](obl-disputes.md); those skills call `buildObl*` then return here for custody/sign.
- Server-side auth login — [auth-api challenge flow](../apps/auth-api/spec/challenge-flow.md) (signature verify only, not chain write).

### OBL envelopes (short)

OBL `custom_json` ids are **`obl-mainnet` / `obl-testnet`** (not `odl-*`). Build with `@opden-data-layer/hive-broadcast` helpers: `buildOblOfferPublishOp`, `buildOblContractSignOp`, `buildOblInvoiceIssueOp`, `buildOblPaymentDeclareOp`, `buildOblPaymentConfirmOp`, `buildOblDisputeOpenOp`, `buildOblDisputeResolveOp`, etc. Full cycle playbooks: skills above.

## Key custody (decide with the user first)

After signup, **ask explicitly** how signing should work before building or sending transactions:

| Mode | Who holds keys | Agent role | Typical use |
|------|----------------|------------|-------------|
| **Wallet (recommended)** | User (Keychain, HiveAuth, HiveSigner) | Build `HiveOperation[]`; user approves in wallet UI | Browser / interactive |
| **HAS agent session (recommended for autonomous agents)** | User on phone (Keychain Mobile); agent holds HAS session (`auth_key` + `token`) | Run local `agent-wallet` daemon; MCP `has_login_*` + `has_broadcast_*`; user approves on device | Cursor / shell agents without posting keys — see [hive-has-agent-wallet.md](hive-has-agent-wallet.md) |
| **Payload only** | User | Agent outputs JSON ops + envelope; user signs elsewhere | Maximum safety |
| **Session posting key** | User pastes **posting** key for one session/script | Agent signs with `@hiveio/dhive` locally | Automation, CI, bots — **high risk** |

Rules:

- **Never** persist posting/active/owner/memo keys in repo, `.env` commits, chat logs, or agent memory unless the user **explicitly** chooses session-key mode for a bounded task — and clear after use.
- **Default:** wallet or payload-only; do not ask for keys proactively.
- ODL writes almost always need **posting** authority (`required_posting_auths: [account]`).
- Link back to [signup key rules](hive-account-signup.md#key-handling-rules-mandatory): no password reset, confirm username.
- **Also pick ODL network** (`mainnet` / `testnet`) once per conversation — [§ ODL network](#odl-network-mainnet-vs-testnet).

## Architecture map

```mermaid
flowchart LR
  subgraph discover [Discover schema]
    MCP[get_object_type / get_update_schema]
    Core[OBJECT_TYPE_REGISTRY / UPDATE_REGISTRY]
  end
  subgraph build [Build ops]
    HB["@opden-data-layer/hive-broadcast"]
    WebCreate[build-create-ops.ts for object_create]
  end
  subgraph sign [Sign and send]
    Wallet[Keychain / HiveAuth / HiveSigner]
    AgentWallet[agent-wallet MCP + HAS session]
    Dhive["@hiveio/dhive PrivateKey"]
  end
  MCP --> Core
  MCP --> build
  HB --> sign
  WebCreate --> HB
  Wallet --> Chain[Hive blockchain]
  AgentWallet --> Chain
  Dhive --> Chain
```

| Layer | Package / tool | Role |
|-------|----------------|------|
| Operation builders | [`@opden-data-layer/hive-broadcast`](../../../libs/hive-broadcast/src/index.ts) | Normalized `HiveOperation` + ODL `custom_json` builders |
| Registries (source of truth) | `@opden-data-layer/core` — `OBJECT_TYPE_REGISTRY`, `UPDATE_REGISTRY` | Valid object/update types |
| Registry for agents | **knowledge-api MCP** — `get_object_create_playbook`, `list_object_types`, `get_object_type`, `list_update_types`, `get_update_schema` | Playbooks, schemas, examples, supported/supposed updates |
| Object create (multi-event) | [`apps/web/.../build-create-ops.ts`](../../../apps/web/src/modules/object-create/application/build-create-ops.ts) | `object_create` + many `update_create`; chunking / IPFS |
| Web signing | `getWalletFacade().broadcast()` | Browser wallets |
| Standalone signing | `@hiveio/dhive` | `Client` + `PrivateKey` (posting) |

## ODL network (mainnet vs testnet)

ODL does **not** use a separate Hive blockchain. Mainnet and testnet are **namespaces** on the same chain: the Hive `custom_json.id` field separates production ODL state from dev/sandbox state.

| `ODL_NETWORK` (env) | Hive `custom_json.id` | Typical use |
|---------------------|------------------------|-------------|
| `mainnet` (default) | `odl-mainnet` | Production Waivio/ODL apps, public data |
| `testnet` | `odl-testnet` | Local dev, staging experiments, agent smoke tests |

**Must stay consistent across a deployment:**

| Component | Config |
|-----------|--------|
| **web** broadcasts | `ODL_NETWORK` → [`useOdlCustomJsonId()`](../../../apps/web/src/config/odl-network-provider.tsx) |
| **chain-indexer** ingestion | same `ODL_NETWORK` — only txs with matching `custom_json.id` are indexed |
| **query-api** reads | Postgres reflects whichever network the indexer ingested |

A tx on `odl-testnet` is valid on Hive but **invisible** to a mainnet-indexed site (and vice versa). Never mix ids in one workflow or transaction batch.

Resolver (same mapping as web): [`resolveOdlCustomJsonId`](../../../apps/web/src/config/odl-network.ts).

### Agent rule — ask once, remember for the session

Before the **first** ODL broadcast in a conversation (right after key custody, or together with it):

1. **Ask explicitly:** *“Which ODL network — **mainnet** (production) or **testnet** (dev/sandbox)?”*
2. **Infer only when obvious** — e.g. user says “local docker”, “staging `.env` has `ODL_NETWORK=testnet`”, or “write to production Waivio” → state the inference and confirm in one line.
3. **Record in session** (conversation context, not repo files):
   - `odlNetwork`: `mainnet` | `testnet`
   - `odlCustomJsonId`: `odl-mainnet` | `odl-testnet`
4. **Reuse on every later broadcast** in the same chat — pass `id: odlCustomJsonId` to all `buildOdl*` ops and `object_create` envelopes. Do **not** re-ask unless the user switches networks.
5. **Switch only on user request** — if they change network mid-session, update both variables and say so before the next tx.

Defaults when the user does not care:

| Context | Default |
|---------|---------|
| Production / public app / “real” objects | `mainnet` → `odl-mainnet` |
| Local repo, CI smoke, throwaway test objects | `testnet` → `odl-testnet` |

Scripts with session posting key: read `process.env.ODL_NETWORK` (or ask user) — same value as root `.env` / compose for that stack.

Envelope shape (normative): [`docs/spec/README.md`](../spec/README.md) § ODL event ids.

```json
{ "events": [ { "action": "…", "v": 1, "payload": { } } ] }
```

Actions: `object_create`, `update_create`, `update_vote`, `rank_vote`, `object_favorite`, `object_ownership`, `object_follow`, `user_follow`, `batch_import`, … — indexer handlers in [odl-pipeline](../apps/chain-indexer/spec/odl-pipeline.md).

## Step 1 — Resolve object/update schema (MCP)

With **knowledge-api** running (`pnpm nx serve knowledge-api`):

1. `list_object_types` — pick `object_type`.
1. `get_object_create_playbook({ object_type })` — product baseline + playbook excerpt.
2. `get_object_type({ object_type: "product" })` — returns:
   - `supported_updates`, `supposed_updates`
   - `example_create_payload` — minimal `object_create` wire example
   - `markdown` — human-readable spec
3. For each update field: `get_update_schema({ update_type: "title" })` — `value_kind`, `cardinality`, `json_schema`, `example_payload`.

Registry code (if you have a checkout): `libs/core/src/object-type-registry/`, `libs/core/src/update-registry/`.

Do **not** invent `object_type` or `update_type` strings — they must exist in the registry or the indexer rejects the tx.

## Step 2 — Build operations (`@opden-data-layer/hive-broadcast`)

Install deps (standalone script outside monorepo is harder — **prefer cloning this repo** per [setup-workspace.md](setup-workspace.md)):

```bash
pnpm install   # root; includes @hiveio/dhive and workspace libs
```

Import builders from `@opden-data-layer/hive-broadcast`:

### ODL builders (library)

| Builder | ODL action(s) | Notes |
|---------|---------------|--------|
| `buildOdlUpdateCreateOp` | `update_create` | `valueKind`: text/geo/json/object_ref/user_ref; indexer auto-likes from `creator` |
| `buildValidatedUpdateCreateOp` | `update_create` | Registry-validated wrapper around `buildOdlUpdateCreateOp` (agent-wallet `odl_build_update_create`) |
| `buildGalleryItemBroadcastOp` | `imageGalleryItem` (+ optional `imageGallery` album ensure) | agent-wallet `odl_build_gallery_item` |
| `buildOdlUpdateCreateWithRankVoteOp` | `update_create` (aggregateRating) + `rank_vote` | Same tx |
| `buildOdlUpdateVoteOp` | `update_vote` | `for` / `against` / `remove` |
| `buildOdlRankVoteOp` | `rank_vote` | rank 0–10000 |
| `buildOdlObjectFavoriteOp` | `object_favorite` | add / remove favorite |
| `buildOdlObjectOwnershipOp` | `object_ownership` | exclusive / supervised |
| `buildOdlObjectFollowOp` | `object_follow` | follow / unfollow / bell |
| `buildOdlUserFollowBellOp` | `user_follow` | bell toggle |
| `buildOdlBatchImportOp` | `batch_import` | IPFS CID; large creates and oversize standalone `update_create` |

### Agent rule: votes

| Action | When to use |
|--------|-------------|
| `update_create` only | Your own new field (MCP `odl_build_update_create`, gallery, object-create fields). Indexer **auto-inserts** creator validity vote `for` — **do not** add `update_vote`. |
| `buildOdlUpdateVoteOp` | Approve/reject **someone else's** existing update (moderation). |
| `buildOdlRankVoteOp` | Rank multi-cardinality alternatives. **Not** for single-cardinality (`image`, `title`, `name`, …). |
| `buildOdlUpdateCreateWithRankVoteOp` | `aggregateRating` only — bundled `update_create` + `rank_vote` in one op. |

### Standard Hive builders

| Builder | Op |
|---------|-----|
| `buildVoteOp` | `vote` |
| `buildCommentOp` | `comment` |
| `buildCommentOptionsOp` | `comment_options` |
| `buildReblogOp` | `custom_json` id `follow` |
| `buildHiveFollowOp` / `buildHiveUnfollowOp` | Hive social follow |
| `buildCustomJsonOp` | Low-level; prefer ODL helpers |
| `buildDelegateVestingSharesOp` | `delegate_vesting_shares` (active) |
| `buildDelegateRcOp` | `custom_json` id `rc` — `{ from, delegatees[], max_rc }` (posting) |
| `buildHiveEngineTokensOp` | Engine delegate/undelegate (active) |

### Wallet delegations (agents)

Full playbook: [wallet-delegation-swap-for-agents.md](wallet-delegation-swap-for-agents.md).

| Build (agent-wallet MCP) | keyType | Verify (query-api MCP) |
|--------------------------|---------|------------------------|
| `hive_build_hp_delegation` | `active` | `get_user_hive_hp_delegations` |
| `hive_build_rc_delegation` | `posting` | `get_user_hive_rc_delegations` |
| `engine_build_token_delegation` | `active` | `get_user_engine_token_delegations` |

Always pass `keyType` from the build result to `wallet_broadcast`. RC removal: `maxRc: 0`. HP undelegate: `amountHp: 0`.

### Hive root posts (agents)

For publishing a **root post** (`comment` + `comment_options` in one tx), use the dedicated playbook — do not hand-roll beneficiaries or tag rules here:

- Skill: [hive-post-create.md](hive-post-create.md) — WAIV-eligible tags, optional beneficiaries (user request only), linked `json_metadata.objects`
- MCP: **`hive_build_post`** on **agent-wallet** → `wallet_broadcast` / `has_broadcast`

Do **not** default beneficiaries (e.g. `waivio` 3%) — that is web UI behavior only.

### Leo object threads (agents)

For a **Leo thread** on an object (Reviews > Threads), use the dedicated playbook — single `comment` op, no `comment_options`, no `hive_build_post`:

- Skill: [hive-thread-create.md](hive-thread-create.md) — resolve `leothreads` parent, append `#object_id` (or `/object/{id}` for dotted ids) to body
- MCP: **`wallet_broadcast`** / **`has_broadcast`** only (agent-wallet has no thread builder and no Hive RPC)

### `object_create` (not a separate builder in hive-broadcast)

New objects need **`object_create`** plus one or more **`update_create`** events:

1. Use `get_object_type` → `example_create_payload` as template.
2. For full publish logic (field order, chunking, IPFS): read [object-create-broadcast](../apps/web/spec/object-create-broadcast.md) and [`buildAllCreateEvents`](../../../apps/web/src/modules/object-create/application/build-create-ops.ts).

Limits:

- `HIVE_CUSTOM_OP_DATA_MAX_LENGTH` = **8192** UTF-8 bytes per `custom_json.json`
- Max **5** `custom_json` ops per transaction for object create (web constant `OBJECT_CREATE_MAX_OPS_PER_TRX`)
- Oversized payloads → IPFS + `buildOdlBatchImportOp`

**Large standalone `update_create`** (e.g. `pageContent`, `skillContent`, `legalText`, `htmlContent` over 8192 bytes): upload the full `{ events: [...] }` envelope to IPFS, then broadcast **`batch_import`** with the CID — **not** OSL `overflow_ref` (that field is for messaging only). Agent-wallet: `odl_build_update_create` → when `requiresIpfsBatch`, `ipfs_upload_file` + `odl_build_batch_import`. See [ipfs-file-upload.md](ipfs-file-upload.md).

Example — single field update after object exists (library or MCP `odl_build_update_create`):

```ts
import { buildValidatedUpdateCreateOp } from '@opden-data-layer/hive-broadcast';

const odlCustomJsonId = 'odl-mainnet'; // session choice — see § ODL network

const op = buildValidatedUpdateCreateOp({
  id: odlCustomJsonId,
  objectId: 'product-abc123',
  updateType: 'title',
  creator: 'alice',
  value: 'My product',
});
// op.type === 'custom_json' — envelope has update_create only, no object_create
```

Lower-level builder (when value_kind is known):

```ts
import { buildOdlUpdateCreateOp } from '@opden-data-layer/hive-broadcast';

const op = buildOdlUpdateCreateOp({
  id: odlCustomJsonId,
  objectId: 'product-abc123',
  updateType: 'title',
  creator: 'alice',
  valueKind: 'text',
  value: 'My product',
  required_posting_auths: ['alice'],
});
// op.type === 'custom_json'
```

## Step 3 — Sign and broadcast

### A) Browser wallet (web app pattern)

Normalized ops → wallet wire format → user confirms:

- [`keychain-signer.ts`](../../../apps/web/src/modules/auth/infrastructure/signers/keychain-signer.ts) maps `HiveOperation` → Keychain tuples.
- `getWalletFacade().broadcast({ operations: [op] })` → `{ transactionId }`.

Agents in browser automation: build ops in JS, invoke wallet; **do not** extract keys from extension storage.

### B) `@hiveio/dhive` (script / agent with session posting key)

Only when user **explicitly** opts in to session-key mode:

```ts
import { Client, PrivateKey } from '@hiveio/dhive';
import { buildOdlUpdateCreateOp } from '@opden-data-layer/hive-broadcast';

const account = 'alice';
const odlCustomJsonId =
  process.env.ODL_NETWORK === 'testnet' ? 'odl-testnet' : 'odl-mainnet';
const postingKey = PrivateKey.fromString(process.env.HIVE_POSTING_KEY!); // session only — never commit
const client = new Client(['https://api.hive.blog']);

const op = buildOdlUpdateCreateOp({
  id: odlCustomJsonId,
  objectId: 'product-abc123',
  updateType: 'title',
  creator: account,
  valueKind: 'text',
  value: 'Hello',
  required_posting_auths: [account],
});

const result = await client.broadcast.sendOperations(
  [
    [
      'custom_json',
      {
        required_auths: op.required_auths,
        required_posting_auths: op.required_posting_auths,
        id: op.id,
        json: op.json,
      },
    ],
  ],
  postingKey,
);

console.log(result.id); // transaction_id
```

Map other `HiveOperation` types the same way as [`keychain-signer.ts`](../../../apps/web/src/modules/auth/infrastructure/signers/keychain-signer.ts) (`vote`, `comment`, …).

### C) HAS agent session (`agent-wallet` MCP daemon)

**Recommended for autonomous agents** when the user should not paste posting keys. Keys stay on the phone; the local daemon holds a HAS session and requests signatures via Keychain Mobile.

1. Start daemon: `pnpm nx serve agent-wallet` (binds `127.0.0.1:7500`, bearer token in `~/.odl/agent-wallet.token`).
2. MCP tools: `has_login_start` → send **`webLink`** in chat ([has-login-from-chat](has-login-from-chat.md)) or QR in terminal → poll `has_login_status` until `active`.
3. Build ops: `odl_build_object_create` (new) / `odl_build_update_create` / `odl_build_gallery_item` / `hive_build_post`, or `@opden-data-layer/hive-broadcast` builders, then `has_broadcast` + poll `has_broadcast_status`.

Full playbook: [hive-has-agent-wallet.md](hive-has-agent-wallet.md). Implementation: `apps/agent-wallet`, `@opden-data-layer/hive-auth`.

## Step 4 — Confirm on chain

- Poll `condenser_api.get_transaction` / block explorer with `transaction_id`.
- Web app: `awaitTrxConfirmation(trxId)` via notifications WS — see [`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md).
- Indexer lag: query-api may update after **chain-indexer** processes the block — allow seconds.

## Agent workflow checklist

1. Confirm account exists; agree **key custody mode** and **ODL network** (`mainnet` / `testnet`) with user — **remember both for all broadcasts in this conversation**.
2. `get_object_type` / `get_update_schema` for the task.
3. Build `HiveOperation[]` with `@opden-data-layer/hive-broadcast` (+ `build-create-ops` pattern if creating objects).
4. Validate JSON size ≤ 8192 bytes per op (or plan IPFS batch).
5. Sign (wallet or dhive per mode).
6. Return `transaction_id`; verify account/op on chain.
7. If session key was used — remind user to revoke/clear it.

## Verification

```bash
pnpm nx test hive-broadcast
pnpm nx test web --testPathPattern=build-create-ops   # object create chunking
```

MCP smoke:

- `get_object_type` with a known type (e.g. `product`, `list`)
- `get_update_schema` with `title`

## OSL messaging (`libs/hive-broadcast/src/osl-operations.ts`)

| Builder | Action |
|---------|--------|
| `buildOslChannelCreateOp` | `channel_create` (group/object) |
| `buildOslMessageCreateOp` | `message_create` (DM bootstrap via `peer` or existing `channel_id`) |

Payload shapes (`buildGroupChannelCreatePayload`, `buildMessageCreatePayload`, `buildEncryptedMessageCreatePayload`, …) live in `@opden-data-layer/hive-broadcast` — see [osl-messaging skill](osl-messaging.md) for agent workflows.

See [OSL channels](../../spec/osl/channels.md) and [OSL messages](../../spec/osl/messages.md).

**On behalf of another account:** when a grantor delegated posting authority to the wallet identity, put the **grantor name** in ops (`author`, `required_posting_auths`, ODL `creator`) and sign with the wallet posting key. See [hive-account-authority-for-agents.md](hive-account-authority-for-agents.md).

## Related

- [Hive posting authority for agents](hive-account-authority-for-agents.md) — discover grantors, act-as, grant/revoke posting
- [Setup workspace](setup-workspace.md) — clone repo for libs
- [OBL offers and contracts](obl-offers-contracts.md) · [OBL ledger](obl-ledger.md) · [OBL disputes](obl-disputes.md)
- [Object create broadcast](../apps/web/spec/object-create-broadcast.md) — chunking / IPFS
- [ODL pipeline](../apps/chain-indexer/spec/odl-pipeline.md) — what indexer accepts
- [Objects domain](../spec/objects-domain.md) — ResolvedView after indexing
- [knowledge-api overview](../apps/knowledge-api/spec/overview.md) — MCP tools
