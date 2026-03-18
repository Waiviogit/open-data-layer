# Social and Account Ingestion

**Back:** [Spec index](README.md) · **Related:** [architecture](architecture.md), [reject-codes](reject-codes.md), [acceptance-tests](acceptance-tests.md), [vote-semantics](vote-semantics.md), [authority-entity](authority-entity.md)

## 1) Scope

This document defines deterministic ingestion and normalization for Hive social/account operations:

- `mute`
- `follow`
- `unfollow`
- `reblog`
- `create_account`
- `update_account` (v1/v2)

It is normative for Indexer Service storage schema and merge behavior.

## 2) Canonical ordering

All social/account events are applied in canonical order by `event_seq ASC` — a packed BIGINT encoding `(block_num, trx_index, op_index, odl_event_index)`. See `libs/core/src/event-seq.ts`.

All conflict resolution and merge behavior in this document uses this ordering.

## 3) Collections / tables

## 3.1 `social_follows_current`

Active follow edges. A row's presence means the follow is active.

- `follower` (string, PK part)
- `following` (string, PK part)
- `updated_transaction_id` (string)
- `updated_at_unix` (bigint, event time)

Primary key: `(follower, following)`

Semantics:

- `follow` → upsert row (INSERT … ON CONFLICT DO UPDATE SET canonical fields)
- `unfollow` → DELETE row

## 3.2 `social_mutes_current`

Active mute edges. A row's presence means the mute is active.

- `muter` (string, PK part)
- `muted` (string, PK part)
- `updated_transaction_id` (string)
- `updated_at_unix` (bigint, event time)

Primary key: `(muter, muted)`

Semantics:

- `mute` → upsert row (INSERT … ON CONFLICT DO UPDATE SET canonical fields)
- `unmute` → DELETE row

## 3.3 `social_reblogs_log`

Append-only reblog log.

- `reblog_id` (string, PK; deterministic hash or tx/op composite)
- `account` (string)
- `author` (string, original post author)
- `permlink` (string, original post permlink)
- `event_seq` (bigint, packed canonical order)
- `transaction_id` (string)
- `event_time_unix` (bigint)

Recommended unique key: `(account, author, permlink, event_seq, transaction_id)`

## 3.4 `accounts_current`

Hive account state plus ODL-computed reputation. Schema is a trimmed version of the Hive `Account` object.

**Hive-sourced fields** (synced from Hive node API):

- `name` (string, PK — Hive account username)
- `hive_id` (int — Hive numeric account id)
- `json_metadata` (text, nullable — raw `json_metadata` string from Hive)
- `posting_json_metadata` (text, nullable — raw `posting_json_metadata` string from Hive)
- `created` (text — account creation timestamp from Hive)
- `comment_count` (int, default 0)
- `lifetime_vote_count` (int, default 0)
- `post_count` (int, default 0)
- `last_post` (text, nullable — timestamp of last post)
- `last_root_post` (text, nullable — timestamp of last root post)

**ODL-computed fields** (maintained by Indexer from authority events):

- `object_reputation` (int, default 0 — count of unique users who hold `administrative` authority claims on objects created by this account, excluding self; see [authority-entity.md](authority-entity.md))

**Metadata:**

- `updated_at_unix` (bigint — last sync/update time)

## 3.5 `social_account_events_log` (optional but recommended)

Raw normalized event log for debugging/replay.

- `event_id` (string, PK)
- `event_kind` (enum)
- `actor` (string)
- `subject` (string, nullable)
- `payload_raw` (json/text)
- canonical order fields + event time
- `apply_status` (applied/rejected/skipped)
- `reject_code` (nullable)

## 4) Account sync model

### 4.1 Hive-sourced fields

Hive account data is synced from the Hive node API (e.g. `condenser_api.get_accounts`). The sync is a full overwrite of all Hive-sourced fields:

```
accounts_current.{hive_id, json_metadata, posting_json_metadata, created,
                  comment_count, lifetime_vote_count, post_count,
                  last_post, last_root_post, updated_at_unix}
  ← latest Hive account state
```

Sync triggers (implementation may vary):

- On first encounter of an account name in any event (lazy creation)
- Periodic background refresh
- On-demand when serving a query that references the account

If the Hive API call fails, the existing row (if any) is preserved unchanged.

### 4.2 `object_reputation` maintenance

`object_reputation` is maintained independently from Hive sync. It is updated by the Indexer when authority events arrive:

- **`object_authority` (method = 'add')** with `authority_type = 'administrative'`:
  1. Look up the object creator: `SELECT creator FROM objects_core WHERE object_id = $object_id`.
  2. If the signing user (`account`) is **not** the creator themselves, increment the creator's `object_reputation` only if this is the **first** administrative claim by this user on **any** object by this creator.
- **`object_authority` (method = 'remove')** with `authority_type = 'administrative'`:
  1. After the authority row is deleted, check if the removed user still holds `administrative` authority on any other object by the same creator.
  2. If no remaining claims, decrement the creator's `object_reputation` by 1.

The invariant:

```sql
-- Verification query (must match accounts_current.object_reputation)
SELECT oc.creator, COUNT(DISTINCT oa.account) AS expected_reputation
FROM object_authority oa
JOIN objects_core oc ON oa.object_id = oc.object_id
WHERE oa.authority_type = 'administrative'
  AND oa.account != oc.creator
GROUP BY oc.creator;
```

### 4.3 Usage in vote weight

`object_reputation` feeds the community vote weight system (see [vote-semantics.md § C](vote-semantics.md#c-community-vote-weight)):

```
votePower = 1 + log₂(1 + object_reputation)
```

### 4.4 Account creation (lazy)

When an account name appears for the first time in any indexed event (update creator, voter, authority claimant, etc.) and no `accounts_current` row exists:

1. Insert a minimal row: `(name = $account, object_reputation = 0)`.
2. Schedule a Hive API sync to populate Hive-sourced fields.

This ensures that `object_reputation` can be maintained from the first authority event, even before Hive data arrives.

### 4.5 Invalid data handling

- If Hive API returns an unknown account (account does not exist on-chain), log a warning but do not delete the local row — it may have valid `object_reputation` from authority events.
- If any field from Hive has an unexpected type, skip that field and log.

## 5) Determinism and replay guarantees

- Replaying the same block range must yield identical `social_follows_current`, `social_mutes_current`, `social_reblogs_log`, and `accounts_current.object_reputation`.
- Hive-sourced fields in `accounts_current` reflect external API state and are not deterministic from the event stream alone — they depend on sync timing. `object_reputation` is fully deterministic from the authority event stream.

## 6) Relationship to governance filters

- Social/account ingestion itself is neutral and deterministic.
- Governance masks are applied at query time.
- Exception already defined in core spec: parsed posts may be excluded from queryable posts dataset when author is muted by effective owner/moderator governance set at post block time.
