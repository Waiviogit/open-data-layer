# Account sync (Hive recovery queue)

## Purpose

Background recovery for Hive accounts when the indexer has no (or incomplete) `accounts_current` row: load canonical account fields from `condenser_api.get_accounts`, then backfill **blog** follow edges and mutes from Hive APIs.

## Enqueue

| Trigger | Behavior |
|---------|----------|
| `account_update` | If `accounts_current` has no row for `account`, enqueue `account_name` (no upsert from the op alone). |
| `create_account` / `create_claimed_account` | After minimal `ensureUserExists`, enqueue the new account name. |

Re-enqueue uses `ON CONFLICT (account_name) DO NOTHING` — duplicate queue rows are ignored.

## Worker (`AccountSyncWorker`)

- **Interval:** `ACCOUNT_SYNC_INTERVAL_MS` (default `30000`), read at `onModuleInit` (same pattern as post vote sync).
- **Batch:** `ACCOUNT_SYNC_BATCH_SIZE` (default `20`).
- **Claim:** `FOR UPDATE SKIP LOCKED`, bump `attempts` and `last_attempt_at`; eligible when `last_attempt_at` is null or older than `60` seconds (same retry window as post sync queue).
- **Steps per task**

  1. `condenser_api.get_accounts([[name]])` — if empty, retry until `ACCOUNT_SYNC_MAX_ATTEMPTS` (default `5`), then delete queue row.
  2. `AccountsCurrentRepository.upsertFromHive` — Hive-sourced columns only; does not overwrite ODL fields (`object_reputation`, `wobjects_weight`, `stage_version`, etc.).
  3. Paginated `condenser_api.get_followers` / `get_following` (`type=blog`, page size `1000`); `user_subscriptions` bulk insert with `ON CONFLICT DO NOTHING`.
  4. `bridge.get_follow_list` with `{ observer, follow_type: "muted" }`; `user_account_mutes` bulk insert with `ON CONFLICT DO NOTHING`.
  5. Delete queue row on success. On RPC/network error, `resetAttempt` (clear `last_attempt_at` for backoff).

## Hive client APIs

| Method | RPC |
|--------|-----|
| `getAccounts(names)` | `condenser_api.get_accounts` |
| `getFollowers(account, start, 'blog', limit)` | `condenser_api.get_followers` |
| `getFollowing(account, start, 'blog', limit)` | `condenser_api.get_following` |
| `getMutedList(observer)` | `bridge.get_follow_list` |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `ACCOUNT_SYNC_INTERVAL_MS` | `30000` | Worker interval (ms). |
| `ACCOUNT_SYNC_BATCH_SIZE` | `20` | Max queue rows per tick. |
| `ACCOUNT_SYNC_MAX_ATTEMPTS` | `5` | Drop queue row after this many failed Hive lookups. |

## Migration

Table: `account_sync_queue` — see [data model schema](../../../../spec/data-model/schema.sql).
