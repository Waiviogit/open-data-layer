# Hive ingestion

**Back:** [chain-indexer overview](overview.md) · **Related:** [ODL pipeline](odl-pipeline.md), [architecture — Indexer service](../../../architecture/overview.md)

## 1) Purpose

Describe how **chain-indexer** advances through Hive blocks, resolves the **current block number** from Redis, and dispatches **parsed operations** into the ODL pipeline.

## 2) Module layout

| Area | Role |
|------|------|
| [`HiveProcessorModule`](../../../../apps/chain-indexer/src/domain/hive-parser/hive-parser.module.ts) | Wires `HiveProcessorModule` from `@opden-data-layer/core` with block key from [`redis-keys.ts`](../../../../apps/chain-indexer/src/constants/redis-keys.ts) and start block from config |
| [`HiveParserProvidersModule`](../../../../apps/chain-indexer/src/domain/hive-parser/hive-parser-providers.module.ts) | Binds `BLOCK_PARSER` to `HiveMainParser` |
| [`HiveProcessorService`](../../../../libs/core/src/hive-processor/hive-processor.service.ts) | Bootstrap loop: fetch block → parse → advance cursor |
| [`BlockCacheService`](../../../../libs/core/src/hive-processor/block-cache.service.ts) | Redis get/set for the block number |
| [`HiveMainParser`](../../../../apps/chain-indexer/src/domain/hive-parser/hive-main-parser.ts) | Per-block operation dispatch |
| [`HiveCustomJsonParser`](../../../../apps/chain-indexer/src/domain/hive-parser/hive-custom-json-parser.ts) | Routes `custom_json` by `id` to ODL |

## 3) Behavior

### 3.1 Block cursor (Redis)

| Item | Details |
|------|---------|
| **Redis key** | `chain-indexer:cache:hive:block-number` — defined in [`redis-keys.ts`](../../../../apps/chain-indexer/src/constants/redis-keys.ts) (`redisKey.hiveBlockNumber()`), not via env |
| **`START_BLOCK_NUMBER`** | Used when the key is missing (default in code: see `env.validation.ts`) |

`BlockCacheService` uses Redis DB **0** (see `HiveProcessorModule.forRootAsync` `redisDb: 0`). On read failure, the cursor falls back to `START_BLOCK_NUMBER`.

If you previously used the env-driven key `chain_indexer:block_number`, migrate the stored value to the new key or accept a fresh cursor from `START_BLOCK_NUMBER`.

### 3.2 Processing loop

On application bootstrap, `HiveProcessorService` starts an async loop:

1. Read `currentBlock` from Redis.
2. `getBlock(currentBlock)` via `HiveClient`.
3. If the block has **no transactions**, log `EMPTY BLOCK` and return from parsing (no throw).
4. If the block **cannot** be fetched, throw → outer catch logs and **sleeps 2000 ms** before retry.
5. On success, `HiveMainParser.parseBlock` runs.
6. **Always** increment: Redis is set to `currentBlock + 1` after each iteration (including empty blocks).

So the cursor always moves forward by one height per loop iteration.

### 3.3 Operation coverage

`HiveMainParser` registers handlers only for **`custom_json`** today. Other operation types are skipped.

### 3.4 ODL `custom_json` id

`HiveCustomJsonParser` routes by `payload.id`:

| `ODL_NETWORK` | Id |
|---------------|-----|
| `mainnet` (default) | `odl-mainnet` |
| `testnet` | `odl-testnet` |

Other ids are ignored.

### 3.5 Configuration note (`HANDLER_CUSTOM_JSON_ENABLED`)

`chain-indexer.config.ts` exposes `hive.handlers.customJson.enabled` from `HANDLER_CUSTOM_JSON_ENABLED` (default: enabled unless set to `false`). The Hive parser **always** wires the `custom_json` handler today; toggling this flag does not skip parsing until the application reads it in the parser layer. If behavior changes, update this spec in the same PR.

## 4) Verification

- Run the app with Redis and Hive RPC available; logs show `Hive Blockchain parser started` and per-block timing: `{blockNum}: {ms}ms`.
- Unit tests for parsers and guards: `pnpm nx test chain-indexer`.

## 5) Related code paths

| Path | Role |
|------|------|
| `apps/chain-indexer/src/domain/hive-parser/` | Hive-side parsing and ODL id routing |
| `libs/core/src/hive-processor/` | Block loop and Redis cursor |
