---
id: docs-apps-chain-indexer-spec-odl-pipeline
title: ODL pipeline
description: Describe how ODL **envelopes** inside Hive `custom_json` are validated, sequenced, and written to PostgreSQL, including **write guards**, **registry** checks, and **batch import** from IPFS.
type: spec
status: active
scope: chain-indexer
tags: [chain-indexer, odl-pipeline]
updated_at: 2026-06-10
related:
  - docs/apps/chain-indexer/spec/overview.md
  - docs/apps/chain-indexer/spec/hive-ingestion.md
  - docs/spec/data-model/flow.md
  - docs/README.md
---

# ODL pipeline

**Back:** [chain-indexer overview](overview.md) · **Related:** [Hive ingestion](hive-ingestion.md), [objects domain](../../../spec/objects-domain.md), [Data model flow](../../../spec/data-model/flow.md)

## 1) Purpose

Describe how ODL **envelopes** inside Hive `custom_json` are validated, sequenced, and written to PostgreSQL, including **write guards**, **registry** checks, and **batch import** from IPFS.

## 2) Module layout

| Area | Role |
|------|------|
| [`OdlParserModule`](../../../../apps/chain-indexer/src/domain/odl-parser/odl-parser.module.ts) | Handlers, guards, `OdlCustomJsonParser`, `BatchImportWorker` |
| [`OdlCustomJsonParser`](../../../../apps/chain-indexer/src/domain/odl-parser/odl-custom-json-parser.ts) | JSON parse → envelope schema → per-event dispatch |
| [`odl-envelope.schema.ts`](../../../../apps/chain-indexer/src/domain/odl-parser/odl-envelope.schema.ts) | Zod schemas for envelope and payloads |
| [`RepositoriesModule`](../../../../apps/chain-indexer/src/repositories/repositories.module.ts) | Kysely repositories for objects, updates, votes, accounts, favorites, ownership, aggregates |

## 3) Envelope and event identity

- Parsed JSON must satisfy **`odlEnvelopeSchema`** (includes an `events` array).
- Each event has an **`action`** string; unknown actions are logged and skipped.
- **`eventSeq`** is computed with `encodeEventSeq` from `@opden-data-layer/core` from block position and index inside the envelope (`blockNum`, `transactionIndex`, `operationIndex`, `odlEventIndex`).

**Context** passed to handlers (`OdlEventContext`) includes creator (posting/auth account), transaction id, timestamp, and `eventSeq`.

## 4) Action → handler mapping

| Action | Handler class | Role (summary) |
|--------|----------------|-----------------|
| `object_create` | `ObjectCreateHandler` | Insert core object row |
| `update_create` | `UpdateCreateHandler` | Insert update row; auto-insert creator validity vote `for`; validate `object_type` / `update_type` against registries; run write guards |
| `update_vote` | `UpdateVoteHandler` | Validity votes |
| `rank_vote` | `RankVoteHandler` | Rank votes; rejects single-cardinality targets; recomputes `object_updates.rank_score` |
| `object_favorite` | `FavoriteHandler` | Favorite rows + reputation side-effect |
| `object_ownership` | `OwnershipHandler` | Ownership rows |
| `object_follow` | `FollowObjectHandler` | Object follows: upsert / delete `user_object_follows`; toggle `bell` |
| `user_follow` | `FollowUserBellHandler` | User subscription bell toggle on `user_subscriptions` (requires existing follow row) |
| `batch_import` | `BatchImportHandler` | Emit in-process event for async IPFS processing |

Registry validation for `update_create` uses **`OBJECT_TYPE_REGISTRY`** / **`UPDATE_REGISTRY`** from `@opden-data-layer/core` (source of truth in code; see [AGENTS.md](../../../../AGENTS.md) — do not treat generated Markdown as canonical).

### WAIV power (parallel path)

[`user_object_powers`](../../../spec/waiv-power.md): ODL handlers emit **`user_object_powers.create`** for participating accounts; **`WaivStakeParser`** (Hive Engine blocks, `tokens` contract, symbol WAIV) emits **`user_object_powers.update`**. **`RankScoreService`** refreshes persisted rank fields on `object_updates` after each accepted `rank_vote`.

## 5) Persistence

Handlers use app repositories only (no business logic in repositories). Aggregated reads for governance utilities may use `AggregatedObjectRepository`. For table-level detail, see [Data model flow](../../../spec/data-model/flow.md) and migrations under `libs/migrations/`.

For **`update_create`**, a **duplicate-value** check (`existsByObjectAndValue` — same `object_id`, `update_type`, and payload in `value_*`) runs for **every** update type and is **not** tied to cardinality. All accepted updates are **append-only** inserts via [`ObjectUpdatesRepository.create`](../../../../apps/chain-indexer/src/repositories/object-updates.repository.ts). Registry `cardinality: single` means the Query layer resolves **one winning VALID row** per field at read time (see [vote-semantics §B](../../../spec/vote-semantics.md#tie-break-for-single-cardinality-field-winner)); it does **not** limit how many rows the indexer stores per creator. **`multi` cardinality** allows multiple rows per creator until blocked by the duplicate-value rule. See [`UpdateCreateHandler`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/update-create.handler.ts).

## 6) Write guards

[`WriteGuardRunner`](../../../../apps/chain-indexer/src/domain/odl-parser/guards/write-guard.ts) runs registered guards for mutating actions (e.g. `update_create`).

[`GovernanceWriteGuard`](../../../../apps/chain-indexer/src/domain/odl-parser/guards/governance-write.guard.ts): for `object_type === governance`, the **event creator** must match the **object creator**; otherwise the update is rejected with a logged warning.

[`LegalDocumentWriteGuard`](../../../../apps/chain-indexer/src/domain/odl-parser/guards/legal-document-write.guard.ts): for `object_type === legal_document`, the **event creator** must match the **object creator** on `update_create`, `update_vote`, and `rank_vote`; otherwise the event is rejected with `UNAUTHORIZED_LEGAL_DOC_OP` (logged warning). See [OBL catalog](../../../spec/obl/catalog.md).

## 7) Governance utilities

[`GovernanceResolverService`](../../../../apps/chain-indexer/src/domain/governance/governance-resolver.service.ts) and [`assembleSnapshot`](../../../../apps/chain-indexer/src/domain/governance/assemble-snapshot.ts) are registered in the app for **shared governance snapshot** logic (similar structure exists on the query side). They are **not** invoked from `OdlCustomJsonParser` or Hive parsers in the current block loop. Request-time resolution semantics remain in [governance resolution](../../../spec/governance-resolution.md) and the query app.

**Index-time status materialization:** [`ObjectStatusHandler`](../../../../apps/chain-indexer/src/domain/odl-parser/handlers/object-status.handler.ts) listens for **`OBJECT_STATUS_RECOMPUTE_EVENT`** (after a persisted `update_create` with `update_type: status`, or after `update_vote` on a status row) and calls [`GovernanceCacheService.resolvePlatform()`](../../../../apps/chain-indexer/src/domain/governance/governance-cache.service.ts) to resolve the vote-winning status update, then writes `objects_core.status` when the materialized value changes. See [Object status](object-status.md).

### Notification enrichment (ODL object names)

ODL handlers emit `objectName: null` on `object_update`, `object_status_change`, and `object_update_reject`. Before the event is written to the notifications Redis stream, [`NotificationAdapterService`](../../../../apps/chain-indexer/src/domain/notification-adapter/notification-adapter.service.ts) fills `payload.objectName` via [`ObjectNameResolverService`](../../../../apps/chain-indexer/src/domain/notification-adapter/object-name-resolver.service.ts): `AggregatedObjectRepository` + `ObjectViewService` with `update_types: [name]` and locale `en-US`. Resolved names are cached at `chain-indexer:cache:object-name:{objectId}` (TTL 300s, see `OBJECT_NAME_CACHE_TTL_SECONDS`); the cache is cleared on `GOVERNANCE_OBJECT_MUTATED_EVENT`. See [notification event catalog](../../notifications/spec/event-catalog.md#objects-odl).

## 8) Batch import (`batch_import`)

1. **`BatchImportHandler`** validates payload (`batchImportPayloadSchema`), then emits **`batch_import.process`** via `EventEmitter2`.
2. **`BatchImportWorker`** listens asynchronously (`@OnEvent`, async handler).
3. Supported payload type: **`ipfs`** with a **`ref`** (CID). Other types log and skip.
4. **Retries:** `BATCH_IMPORT_MAX_RETRIES` (default 3), exponential backoff base `BATCH_IMPORT_RETRY_DELAY_MS` (default 1000 ms): delay = `base * 2^attempt`.
5. On success, **`IpfsClient.cat(ref)`** streams JSON; the worker parses a top-level **`events`** array (streaming JSON) and dispatches each event through the same action handlers as inline ODL (reusing `OdlEventContext` from the parent operation).

IPFS must be reachable at `IPFS_API_URL` when exercising this path. **The gateway that accepted the upload and chain-indexer must share the same Kubo** — gateway pins via `POST /upload/file`, indexer reads via `cat(ref)`. Different nodes (or split `IPFS_API_URL` values) cause silent batch loss after retries. See [ipfs-file-upload.md](../../../skills/ipfs-file-upload.md#shared-kubo-node-ops).

## 9) Verification

- `pnpm nx test chain-indexer` (includes handler and guard specs).
- Manual: publish ODL `custom_json` on Hive testnet/mainnet according to network config and confirm rows in Postgres.

## 10) Related code paths

| Path | Role |
|------|------|
| `apps/chain-indexer/src/domain/odl-parser/handlers/` | Per-action handlers |
| `apps/chain-indexer/src/domain/odl-parser/batch-import.worker.ts` | IPFS stream + dispatch |
| `apps/chain-indexer/src/domain/notification-adapter/` | Redis stream publish; ODL `objectName` enrichment |
