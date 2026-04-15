# Hive social parsers (follow, reblog, mute, profile)

**Back:** [Overview](overview.md) · **Related:** [social-account-ingestion.md](../../../spec/social-account-ingestion.md), [users data model](../../../spec/data-model/users.md)

## Scope

Deterministic handling of Hive operations that drive the social graph and profile display fields, aligned with [tmp/user-social-parsers-spec.md](../../../../tmp/user-social-parsers-spec.md) (behavioral reference).

## Wired operations

| Hive operation | Handler | Persistence |
|----------------|---------|-------------|
| `custom_json` with `id: "follow"` | `FollowSocialService` / `ReblogSocialService` | `user_subscriptions`, `user_account_mutes`, `accounts_current` counters, `post_reblogged_users` (reblog branch) |
| `account_update` | `AccountProfileUpdateService` | `accounts_current` (`alias`, `profile_image`, raw metadata strings) — **update only**, no insert |
| `create_account`, `create_claimed_account` | `AccountEnsureService` | Minimal `accounts_current` row if absent |

## Signer

`transactionAccount = required_posting_auths[0] ?? required_auths[0]` (posting auth preferred).

## Follow JSON (`custom_json` id `follow`)

Parsed array:

- `["reblog", { account, author, permlink }]` — reblog only; no follow/mute side effects.
- `["follow", { follower, following, what }]` — `what[0]` = `blog` → follow; `ignore` → mute + drop subscription if any; empty → clear mute + unfollow if subscribed.

## Reblog

Reblog is **not** a new row in `posts`. It inserts into `post_reblogged_users` for the **resolved source** post (`author`, `permlink`), with `account` = reblogger and `reblogged_at_unix` from block time. Source resolution: exact `(author, permlink)` first, else `(root_author, permlink)`. Idempotent insert: `ON CONFLICT DO NOTHING`.

If the source post is still missing locally after resolution, the pair is **enqueued** on `post_sync_queue` with `needs_post_create = true` (same queue as [vote ingestion](vote-ingestion.md)) so `HivePostSyncWorker` can materialize the post from Hive. The original reblog row is **not** replayed automatically after sync; only the post row and vote sync run there.

## Configuration

| Env | Effect |
|-----|--------|
| `HANDLER_CUSTOM_JSON_ENABLED=false` | Disables all `custom_json` handling, including `id=follow`. |
| `HANDLER_HIVE_FOLLOW_ENABLED=false` | Disables only the Hive `follow` custom_json handler (ODL still runs if configured). |

## Tests

Co-located unit tests: `follow-json.parse.spec.ts` (parse helpers).
