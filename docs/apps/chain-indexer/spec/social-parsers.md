---
id: docs-apps-chain-indexer-spec-social-parsers
title: Hive social parsers
description: Deterministic handling of Hive operations that drive the social graph and profile display fields, aligned with tmp/user-social-parsers-spec.md (behavioral reference).
type: spec
status: active
scope: chain-indexer
tags: [chain-indexer, social-parsers]
updated_at: 2026-10-02
related:
  - docs/apps/chain-indexer/spec/overview.md
  - docs/apps/chain-indexer/spec/account-sync.md
  - docs/spec/data-model/users.md
  - docs/README.md
---

# Hive social parsers (follow, reblog, mute, profile)

**Back:** [Overview](overview.md) · **Related:** [social-account-ingestion.md](../../../spec/social-account-ingestion.md), [users data model](../../../spec/data-model/users.md)

## Scope

Deterministic handling of Hive operations that drive the social graph and profile display fields, aligned with [tmp/user-social-parsers-spec.md](../../../../tmp/user-social-parsers-spec.md) (behavioral reference).

## Wired operations

| Hive operation | Handler | Persistence |
|----------------|---------|-------------|
| `custom_json` with `id: "follow"` | `FollowSocialService` / `ReblogSocialService` | `user_subscriptions`, `user_account_mutes`, `accounts_current` counters, `post_reblogged_users` (reblog branch) |
| `account_update` | `AccountProfileUpdateService` + `AccountAuthorityService` | Profile columns on `accounts_current` when row exists; [account authority grants](account-authority-grants.md) snapshot for present `owner`/`active`/`posting` types; if **no row**, enqueue [account sync](account-sync.md) |
| `account_update2` | Same chain as `account_update` | Same as `account_update` (v2 payload shape) |
| `account_create`, `create_claimed_account` | `AccountEnsureService` + `AccountAuthorityService` | Minimal `accounts_current` row if absent; authority snapshot for new account; enqueue [account sync](account-sync.md) |
| `recover_account` | `AccountAuthorityService` | Owner authority replacement for recovered account; see [account-authority-grants.md](account-authority-grants.md) |

Live create ops are **`account_create`** (paid ~3 HIVE fee) and **`create_claimed_account`** (spends a previously claimed ACT). `claim_account` only buys a ticket (`pending_claimed_accounts`); it does not create an account and is not wired as a create handler.

## Signer

`transactionAccount = required_posting_auths[0] ?? required_auths[0]` (posting auth preferred).

## `account_update` metadata

When the operation payload includes **both** `json_metadata` and `posting_json_metadata`, `AccountProfileUpdateService` updates **both** columns on `accounts_current`. Either field alone updates only that column. Empty strings are stored as-is; absent fields are not overwritten.

## Follow JSON (`custom_json` id `follow`)

Parsed array:

- `["reblog", { account, author, permlink }]` — reblog only; no follow/mute side effects.
- `["follow", { follower, following, what }]` — `what[0]` = `blog` → follow; `ignore` → mute + drop subscription if any; empty → clear mute + unfollow if subscribed.

## Reblog

Reblog is **not** a new row in `posts`. It inserts into `post_reblogged_users` for the **resolved source** post (`author`, `permlink`), with `account` = reblogger and `reblogged_at_unix` from block time. Source resolution: exact `(author, permlink)` first, else `(root_author, permlink)`. Idempotent insert: `ON CONFLICT` updates `reblogged_at_unix = LEAST(existing, excluded)` so a later chain replay can heal a too-new row; a re-index cannot push a correct time forward.

If the source post is still missing locally after resolution, the indexer writes `post_reblog_pending` with the **block** timestamp (`LEAST` on conflict) and enqueues `post_sync_queue` with `needs_post_create = true` (same queue as [vote ingestion](vote-ingestion.md)). After `HivePostSyncWorker` materializes the post (`ensurePostFromHiveForVoteSync` → `'ready'`), it drains pending rows through `findSourcePostForReblog` and `insertRebloggedUser` using the **stored** `reblogged_at_unix` (never `enqueued_at` / `Date.now()`). Terminal outcomes (`is_comment`, `muted`, attempts exhausted) delete matching pending rows so they cannot leak. Drain does **not** re-emit `reblog` / `bell_reblog`.

Mongo imports stamp a provisional `reblogged_at_unix` (post `created_unix`). Heal with `pnpm backfill:reblog-timestamps` from Hive `get_blog_entries.reblogged_on`.

## Configuration

| Env | Effect |
|-----|--------|
| `HANDLER_CUSTOM_JSON_ENABLED=false` | Disables all `custom_json` handling, including `id=follow`. |
| `HANDLER_HIVE_FOLLOW_ENABLED=false` | Disables only the Hive `follow` custom_json handler (ODL still runs if configured). |

## Tests

Co-located unit tests: `follow-json.parse.spec.ts`, `reblog-social.service.spec.ts`, `hive-post-sync.worker.spec.ts`.
