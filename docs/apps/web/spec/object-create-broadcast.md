# Object create broadcast

**Back:** [web overview](overview.md) · **Related:** [object-edit.md](object-edit.md), [images.md](images.md)

## Purpose

Publishing a new object from `/object-create` sends ODL events (`object_create` + `update_create`) to Hive. Payload size is limited per `custom_json` operation; large forms are split across multiple ops in one transaction, or uploaded via IPFS.

## Hive limit

| Constant | Value | Source |
|----------|-------|--------|
| `HIVE_CUSTOM_OP_DATA_MAX_LENGTH` | 8192 | [`libs/hive-broadcast/src/constants.ts`](../../../../libs/hive-broadcast/src/constants.ts) |

Hive validates `custom_json.json` UTF-8 byte length: `json.size() <= 8192`.

## Implementation

| Function | Module | Role |
|----------|--------|------|
| `buildAllCreateEvents` | [`build-create-ops.ts`](../../../../apps/web/src/modules/object-create/application/build-create-ops.ts) | Builds ordered `object_create` + `update_create` events |
| `buildCreateOdlJson` | same | Full envelope `JSON.stringify({ events })` — **IPFS upload** (no per-op limit) |
| `buildCreateOps` | same | Greedy split into `CustomJsonOp[]` — **direct chain broadcast** |
| `OBJECT_CREATE_MAX_OPS_PER_TRX` | same | `5` — max `custom_json` ops per Hive transaction |

### Chunking algorithm (`buildCreateOps`)

1. Walk events in order; append to the current chunk while `UTF-8 byte length of {"events":[...]} <= 8192`.
2. When the next event would exceed the limit, close the current chunk and start a new one with that event.
3. If a **single** event alone exceeds 8192 bytes → throw (cannot broadcast on chain).
4. If more than **5** ops are required → throw.

Each op uses the same `id` (`odlCustomJsonId`), `required_posting_auths: [creator]`, and `required_auths: []`.

### Publish paths

| Path | Chain ops | ODL payload |
|------|-----------|-------------|
| Direct broadcast | `buildCreateOps()` → 1–5 `custom_json` | Split envelopes |
| Broadcast via IPFS | `buildOdlBatchImportOp` (1 `custom_json`) | Full JSON via `buildCreateOdlJson()` → IPFS CID |

Indexer processes each `custom_json` in transaction order; chunked create ops are equivalent to one large envelope split for chain limits only.

### UI (publish dock)

[`PendingOpsDock`](../../../../apps/web/src/modules/object-create/presentation/components/pending-ops-dock.tsx) shows live payload size from `useObjectCreateForm` → `broadcastSize`:

- **Direct:** `{size} · {n} ops` (e.g. `2.1 KB · 2 ops`); warning styling when `opCount >= 4`.
- **IPFS:** `{size}` only (chain carries one `batch_import` op).

## Verification

```bash
pnpm nx test web --testPathPattern=build-create-ops
```
