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
| [`RepositoriesModule`](../../../../apps/chain-indexer/src/repositories/repositories.module.ts) | Kysely repositories for objects, updates, votes, accounts, authority, aggregates |

## 3) Envelope and event identity

- Parsed JSON must satisfy **`odlEnvelopeSchema`** (includes an `events` array).
- Each event has an **`action`** string; unknown actions are logged and skipped.
- **`eventSeq`** is computed with `encodeEventSeq` from `@opden-data-layer/core` from block position and index inside the envelope (`blockNum`, `transactionIndex`, `operationIndex`, `odlEventIndex`).

**Context** passed to handlers (`OdlEventContext`) includes creator (posting/auth account), transaction id, timestamp, and `eventSeq`.

## 4) Action → handler mapping

| Action | Handler class | Role (summary) |
|--------|----------------|-----------------|
| `object_create` | `ObjectCreateHandler` | Insert core object row |
| `update_create` | `UpdateCreateHandler` | Insert update row; validate `object_type` / `update_type` against registries; run write guards |
| `update_vote` | `UpdateVoteHandler` | Validity votes |
| `rank_vote` | `RankVoteHandler` | Rank votes |
| `authority` | `AuthorityHandler` | Object authority edges |
| `batch_import` | `BatchImportHandler` | Emit in-process event for async IPFS processing |

Registry validation for `update_create` uses **`OBJECT_TYPE_REGISTRY`** / **`UPDATE_REGISTRY`** from `@opden-data-layer/core` (source of truth in code; see [AGENTS.md](../../../../AGENTS.md) — do not treat generated Markdown as canonical).

## 5) Persistence

Handlers use app repositories only (no business logic in repositories). Aggregated reads for governance utilities may use `AggregatedObjectRepository`. For table-level detail, see [Data model flow](../../../spec/data-model/flow.md) and migrations under `libs/migrations/`.

## 6) Write guards

[`WriteGuardRunner`](../../../../apps/chain-indexer/src/domain/odl-parser/guards/write-guard.ts) runs registered guards for mutating actions (e.g. `update_create`).

[`GovernanceWriteGuard`](../../../../apps/chain-indexer/src/domain/odl-parser/guards/governance-write.guard.ts): for `object_type === governance`, the **event creator** must match the **object creator**; otherwise the update is rejected with a logged warning.

## 7) Governance utilities (not in the hot path)

[`GovernanceResolverService`](../../../../apps/chain-indexer/src/domain/governance/governance-resolver.service.ts) and [`assembleSnapshot`](../../../../apps/chain-indexer/src/domain/governance/assemble-snapshot.ts) are registered in the app for **shared governance snapshot** logic (similar structure exists on the query side). They are **not** invoked from `OdlCustomJsonParser` or Hive parsers in the current block loop. Request-time resolution semantics remain in [governance resolution](../../../spec/governance-resolution.md) and the query app.

## 8) Batch import (`batch_import`)

1. **`BatchImportHandler`** validates payload (`batchImportPayloadSchema`), then emits **`batch_import.process`** via `EventEmitter2`.
2. **`BatchImportWorker`** listens asynchronously (`@OnEvent`, async handler).
3. Supported payload type: **`ipfs`** with a **`ref`** (CID). Other types log and skip.
4. **Retries:** `BATCH_IMPORT_MAX_RETRIES` (default 3), exponential backoff base `BATCH_IMPORT_RETRY_DELAY_MS` (default 1000 ms): delay = `base * 2^attempt`.
5. On success, **`IpfsClient.cat(ref)`** streams JSON; the worker parses a top-level **`events`** array (streaming JSON) and dispatches each event through the same action handlers as inline ODL (reusing `OdlEventContext` from the parent operation).

IPFS must be reachable at `IPFS_API_URL` when exercising this path.

## 9) Verification

- `pnpm nx test chain-indexer` (includes handler and guard specs).
- Manual: publish ODL `custom_json` on Hive testnet/mainnet according to network config and confirm rows in Postgres.

## 10) Related code paths

| Path | Role |
|------|------|
| `apps/chain-indexer/src/domain/odl-parser/handlers/` | Per-action handlers |
| `apps/chain-indexer/src/domain/odl-parser/batch-import.worker.ts` | IPFS stream + dispatch |
| `apps/chain-indexer/src/repositories/` | SQL write path |
