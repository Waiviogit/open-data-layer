# MongoDB → PostgreSQL data import (ODL)

One-off **data** migrations from Mongo export files into the ODL Postgres schema. This is separate from **schema** migrations (`pnpm migrate` / `@opden-data-layer/migrations`).

## Prerequisites

- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DATABASE` (and optionally `POSTGRES_PASSWORD`, `POSTGRES_PORT`) set in the environment (e.g. via root `.env` with `tsx --env-file=.env`).
- JSON exports as **arrays** of documents (same format as `stream-json` array streaming expects).

## Commands

All bulk importers accept `--skip-indexes` (drops secondary indexes before insert, recreates after).

| Script | Input | Target tables |
|--------|--------|----------------|
| `pnpm migrate:mongo-objects` | Wobject array JSON | `objects_core`, `object_updates`, `validity_votes`, `object_favorite`, `object_ownership` |
| `pnpm migrate:mongo-posts` | Post array JSON | `posts`, `post_active_votes`, `post_objects`, `post_object_related_images`, `post_reblogged_users`, `post_languages`, `post_links`, `post_mentions` |
| `pnpm migrate:mongo-users` | User array JSON | `accounts_current` (Waivio columns), `user_metadata`, `user_notification_settings`, `user_referrals`, `user_post_bookmarks`, `user_object_follows` |
| `pnpm migrate:mongo-user-expertise` | `user_expertise` collection JSON | `user_object_expertise` (does not update aggregate weights) |
| `pnpm seed:post-expertise-applied` | — (SQL one-off) | `posts.expertise_applied_at` for rows with `rewards_finalized_at` |
| `pnpm migrate:mongo-subscriptions` | Subscription array JSON | `user_subscriptions` |
| `pnpm migrate:mongo-mutes` | Mute / ignore pair array JSON | `user_account_mutes` |
| `pnpm migrate:mongo-delegations` | `delegations` collection JSON | `user_delegations` |
| `pnpm migrate:mongo-rc-delegations` | `user_rc_delegations` collection JSON | `user_rc_delegations` |
| `pnpm migrate:mongo-currency-statistics` | `currency_statistics` collection JSON | `currency_statistics` |
| `pnpm migrate:mongo-hive-engine-rates` | `hive_engine_rates` collection JSON | `hive_engine_rates` |
| `pnpm migrate:mongo-currency-rates` | `currency_rates` collection JSON | `currency_rates` |
| `pnpm migrate:mongo-hive-engine-swaps` | `EngineAccountHistory` swap rows JSON | `hive_engine_swaps` |
| `pnpm migrate:mongo-hive-engine-waiv-airdrops` | `EngineAccountHistory` WAIV airdrop rows JSON | `hive_engine_waiv_airdrops` |
| `pnpm migrate:mongo-hive-engine-deposit-records` | `EngineAccountHistory` `createDepositRecord` rows JSON | `hive_engine_deposit_records` |

### Objects (wobjects)

```bash
pnpm migrate:mongo-objects <path-to-wobjects.json> [--skip-indexes]
pnpm migrate:mongo-objects --recreate-indexes
```

`--skip-indexes` drops `object_updates` indexes and the search-vector trigger before bulk insert, then recreates them. Use for large files.

`--recreate-indexes` only rebuilds those indexes (`CREATE INDEX IF NOT EXISTS`). Use after a `--skip-indexes` run that imported rows but failed during FTS/GIN recreate (e.g. Postgres `XX001` missing TOAST chunk). Does not re-read the JSON dump.

Re-running the same export is safe: child rows still use `ON CONFLICT DO NOTHING`, but existing `objects_core` rows get `created_at` updated from Mongo `createdAt` when present (no truncate required for that column).

### Posts

```bash
pnpm migrate:mongo-posts <path-to-posts.json>
```

### Users

```bash
pnpm migrate:mongo-users <path-to-users.json>
```

### Subscriptions

```bash
pnpm migrate:mongo-subscriptions <path-to-subscriptions.json>
```

### Mutes (social ignore pairs)

```bash
pnpm migrate:mongo-mutes <path-to-mutes.json>
```

### HP delegations (`delegations` collection)

```bash
pnpm migrate:mongo-delegations <path-to-delegations.json> [--skip-indexes]
```

Mongo export:

```bash
mongoexport --collection=delegations --out=delegations.json --jsonArray
```

### RC delegations (`user_rc_delegations` collection)

```bash
pnpm migrate:mongo-rc-delegations <path-to-user_rc_delegations.json> [--skip-indexes]
```

Mongo export:

```bash
mongoexport --collection=user_rc_delegations --out=user_rc_delegations.json --jsonArray
```

Each document: `delegator`, `delegatee`, `rc` (numeric, raw chain units).

### Currency (legacy currency-service collections)

Each input file must be a **top-level JSON array** of Mongo documents (same `stream-json` streaming format as objects/posts). Run **one script per collection**:

```bash
pnpm migrate:mongo-currency-statistics <path-to-currency_statistics.json> [--dry-run] [--stats-daily-only] [--skip-indexes]
pnpm migrate:mongo-hive-engine-rates <path-to-hive_engine_rates.json> [--dry-run] [--skip-indexes]
pnpm migrate:mongo-currency-rates <path-to-currency_rates.json> [--dry-run] [--skip-indexes]
```

`--skip-indexes` drops secondary indexes on the target table before bulk insert and recreates them after (use for large files).

Field mapping lives in [`currency/shared.ts`](currency/shared.ts) (`hive` / `hive_dollar` blocks for statistics; Hive Engine WAIV-style rows; fiat columns or `quotes`).

**Docker** (mount one export per run):

```bash
sudo docker compose -p apps --env-file .env -f docker-compose.staging.apps.yml --profile tools run --rm \
  -v /home/waivio/hive_engine_rates.json:/data/hive_engine_rates.json \
  migrator \
  pnpm migrate:mongo-hive-engine-rates /data/hive_engine_rates.json
```

Repeat for `currency_statistics.json` and `currency_rates.json` with the matching script. Host paths should match where your `mongoexport` JSON files live.

### Hive Engine swaps (`EngineAccountHistory` collection)

```bash
pnpm migrate:mongo-hive-engine-swaps <path-to-engine_swaps.json> [--dry-run] [--skip-indexes]
```

Mongo export (swap rows only):

```bash
mongoexport --collection=engineaccounthistories \
  --query='{"operation":"marketpools_swapTokens"}' \
  --out=engine_swaps.json --jsonArray
```

Maps legacy fields (`symbolOut`, `symbolIn`, quantities, unix `timestamp`) into `hive_engine_swaps`. Re-runs are idempotent via `ON CONFLICT (transaction_id, account) DO NOTHING`.

### Historical WAIV airdrops (`EngineAccountHistory` collection)

```bash
pnpm migrate:mongo-hive-engine-waiv-airdrops <path-to-waiv_airdrops.json> [--dry-run] [--skip-indexes]
```

Mongo export (WAIV airdrop rows only):

```bash
mongoexport --collection=engineaccounthistories \
  --query='{"operation":"airdrops_newAirdrop","symbol":"WAIV"}' \
  --out=waiv_airdrops.json --jsonArray
```

Maps legacy fields into `hive_engine_waiv_airdrops` (one-time historical data; no chain-indexer parser). See [`docs/spec/data-model/hive-engine-waiv-airdrops.md`](../../docs/spec/data-model/hive-engine-waiv-airdrops.md).

### Hive Engine deposit instructions (`EngineAccountHistory` collection)

```bash
pnpm migrate:mongo-hive-engine-deposit-records <path-to-engine_deposit_records.json> [--dry-run] [--skip-indexes]
```

Mongo export (`createDepositRecord` rows only — legacy `waivio_hive_engine` on-chain format):

```bash
mongoexport --collection=engineaccounthistories \
  --query='{"operation":"createDepositRecord"}' \
  --out=engine_deposit_records.json --jsonArray
```

Maps legacy camelCase fields into `hive_engine_deposit_records`. New on-chain writes use OSL `hive_engine_deposit` (indexed by chain-indexer). See [`docs/spec/data-model/hive-engine-deposit-records.md`](../../docs/spec/data-model/hive-engine-deposit-records.md).

**Breaking rename:** the old script name `migrate:mongo` was replaced by `migrate:mongo-objects`.

## Post export mapping

Source shape: legacy Mongo [`PostSchema`](../../tmp/PostSchema.js). ODL columns: [`libs/odl-db-types/src/odl/tables.ts`](../../libs/odl-db-types/src/odl/tables.ts).

- **Skipped:** `blocked_for_apps`, singular `language`, `reblog_to`. Posts with both `title` and `body` empty after trim are ignored entirely (stat `postsSkippedEmptyTitleBody`).
- **`post_languages`:** `languages[]` may use regional tags (`en-US`). The importer stores the **primary language subtag** only (`en`), canonicalized with `Intl`, and dedupes per post (e.g. `en-US` + `en-GB` → one `en` row).
- **`post_objects`:** Built with the same merge rules as chain-indexer (`json_metadata.objects` or legacy `wobjects`, `tags` / `json_metadata.tags`, body `/object/...`). `object_type` from legacy `wobjects` when present. Rows are inserted only when `object_id` exists in `objects_core` (missing FKs are skipped; see migrator stats `postObjectsSkippedNoFk`).
- **`post_object_related_images`:** Derived from `json_metadata.image` (HTTPS URLs) × eligible `post_objects` rows (same rules as chain-indexer `buildRelatedImageRows`). Stats: `relatedImageRowsBuffered`, `relatedImageRowsSkippedNoFk`, `relatedImageRowsSkippedNoImages`, `relatedImageRowsSkippedIneligibleType`. Re-runs use `ON CONFLICT DO NOTHING`. For a full rebuild: `TRUNCATE post_object_related_images` then re-run `migrate:mongo-posts`.
- **`post_reblogged_users.reblogged_at_unix`:** Mongo stores only account names — there is no per-reblog time. The importer writes a **provisional** `created_unix` of the post (never `updatedAt`; that stamped one mongo-touch time onto every reblogger). **Required after this importer:** `pnpm backfill:reblog-timestamps` (Hive `condenser_api.get_blog_entries.reblogged_on`). Until that runs, profile blogs sort reblogs by post creation, not reblog time.
- **`created_unix`:** `created` string, then mongoose `createdAt` / `updatedAt`, then `_id` ObjectId seconds.

Inserts use `ON CONFLICT DO NOTHING` on natural keys so re-runs are idempotent.

## User export mapping

Source: [`tmp/UserSchema.js`](../../tmp/UserSchema.js). ODL: [`libs/odl-db-types/src/odl/tables.ts`](../../libs/odl-db-types/src/odl/tables.ts).

- **`user_notification_settings.vote`:** from nested JSON `user_metadata.settings.userNotifications.like` (Mongo field name `like`; stored as column `vote` because `like` is a PostgreSQL reserved word).
- **`user_post_bookmarks`:** only entries in `user_metadata.bookmarks[]` containing `/` are split into `author` + `permlink`; others are skipped (object bookmarks not modeled).
- **`user_object_follows`:** only rows whose `object_id` exists in `objects_core` are inserted; see migrator stats `objectFollowsSkippedNoFk`.
- **`hive_id`, `comment_count`, `lifetime_vote_count`, `last_post`, `object_reputation`:** not present on Mongo user export; importer uses 0 / null defaults on **insert** only. Re-runs **update** Mongo-sourced Waivio columns (`posting_json_metadata`, `json_metadata`, `alias`, counts, …) but do **not** overwrite Hive indexer fields (`hive_id`, `created`, `comment_count`, …).
- Re-running the same users export refreshes Mongo-sourced Waivio columns. **`json_metadata` / `posting_json_metadata`:** upsert uses `COALESCE(excluded, existing)` — a null/empty value in the export does **not** wipe a non-null value already in Postgres (from a prior export or chain-indexer). For chain-authoritative profile text, rely on chain-indexer `account_update` / [account sync](../../docs/apps/chain-indexer/spec/account-sync.md), or query-api live Hive reads on profile endpoints.

## Required post-migration: reblog timestamps

```bash
pnpm backfill:reblog-timestamps --dry-run
pnpm backfill:reblog-timestamps
```

Pages every account in `post_reblogged_users` through Hive `get_blog_entries` and overwrites `reblogged_at_unix` when `|existing − hive| > 60s`. Resumable via `scripts/.backfill-reblog-timestamps.checkpoint.json` (completed-set; failed RPC accounts are retried on rerun, no `--reset-checkpoint` needed). Non-zero exit means some accounts failed — rerun. `--account=name` limits to one profile.

## Related

- Spec: [`docs/spec/data-model/posts.md`](../../docs/spec/data-model/posts.md), [`docs/spec/data-model/post-object-related-images.md`](../../docs/spec/data-model/post-object-related-images.md), [`docs/spec/data-model/users.md`](../../docs/spec/data-model/users.md)
- Schema migrations: [`docs/operations/migrations.md`](../../docs/operations/migrations.md)
