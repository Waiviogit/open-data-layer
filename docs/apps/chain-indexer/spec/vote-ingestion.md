# Vote ingestion and Hive sync queue

**Related:** [Hive ingestion](hive-ingestion.md), [Data model posts](../../../spec/data-model/posts.md), [`post_sync_queue`](../../../spec/data-model/schema.sql)

## Hive `vote` operation

| Field | Type | Notes |
|-------|------|--------|
| `voter` | string | Account casting the vote |
| `author` | string | Post author |
| `permlink` | string | Post permlink |
| `weight` | int | \(-10000\)–\(10000\); `0` removes the vote (unvote) |

`percent` stored in `post_active_votes` follows `weight / 100` (Hive-style percent scale).

## `post_sync_queue`

| Column | Role |
|--------|------|
| `author`, `permlink` | PK; target post |
| `enqueued_at` | Block time (Unix seconds) when the vote was seen |
| `needs_post_create` | `true` if no row existed in `posts` at enqueue time (ghost post / not yet indexed) |
| `attempts` | Claim attempts (incremented when a worker picks the row) |
| `last_attempt_at` | Unix seconds of last claim; `null` = never tried or reset after a reversible failure |

On conflict, `needs_post_create` is merged with **OR** (once `true`, it stays `true` until the post exists). `enqueued_at` keeps the **minimum** (earliest) timestamp.

## Behavior

1. **Valid vote payload** — Parsed with Zod; invalid payloads are logged and skipped.
2. **`post_active_votes` and FK** — Rows reference `posts (author, permlink)`. If the post **does not** exist locally, the indexer **cannot** insert a vote row yet; it still **enqueues** the pair with `needs_post_create = true`. After `HivePostSyncWorker` creates the post from Hive (`getContent` / `ensurePostFromHiveForVoteSync`), votes are reconciled from `get_active_votes`.
3. **Post exists** — Non-zero `weight`: upsert `(weight, percent)` with `rshares` left `null` until the worker fills them from Hive. `weight === 0`: delete the voter row (unvote) and still enqueue so `net_votes` / rshares can be refreshed from the API.
4. **Worker** — Claims batches (`FOR UPDATE SKIP LOCKED`), optionally materializes the post when `needs_post_create`, then calls `get_active_votes`, syncs `post_active_votes`, and deletes the queue row. Transient Hive errors reset `last_attempt_at` for retry; repeated “post unknown on Hive” beyond `POST_SYNC_MAX_ATTEMPTS` drops the queue row.

## Configuration

| Env | Default | Purpose |
|-----|---------|---------|
| `POST_SYNC_INTERVAL_MS` | `30000` | Interval between worker ticks (`postSync.intervalMs` via `ConfigService`, registered in `onModuleInit`) |
| `POST_SYNC_BATCH_SIZE` | `50` | Rows claimed per tick |
| `POST_SYNC_MAX_ATTEMPTS` | `5` | Max claims before giving up on a missing Hive post |

**Code:** `VoteHiveService`, `HivePostSyncWorker`, `PostSyncQueueRepository`, migration `00007_post_sync_queue`.
