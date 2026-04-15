# MongoDB → PostgreSQL data import (ODL)

One-off **data** migrations from Mongo export files into the ODL Postgres schema. This is separate from **schema** migrations (`pnpm migrate` / `@opden-data-layer/migrations`).

## Prerequisites

- `DATABASE_URL` pointing at the target database (e.g. via root `.env` with `tsx --env-file=.env`).
- JSON exports as **arrays** of documents (same format as `stream-json` array streaming expects).

## Commands

| Script | Input | Target tables |
|--------|--------|----------------|
| `pnpm migrate:mongo-objects` | Wobject array JSON | `objects_core`, `object_updates`, `validity_votes`, `object_authority` |
| `pnpm migrate:mongo-posts` | Post array JSON | `posts`, `post_active_votes`, `post_objects`, `post_reblogged_users`, `post_languages`, `post_links`, `post_mentions` |
| `pnpm migrate:mongo-users` | User array JSON | `accounts_current` (Waivio columns), `user_metadata`, `user_notification_settings`, `user_referrals`, `user_post_bookmarks`, `user_object_follows` |
| `pnpm migrate:mongo-subscriptions` | Subscription array JSON | `user_subscriptions` |
| `pnpm migrate:mongo-mutes` | Mute / ignore pair array JSON | `user_account_mutes` |

### Objects (wobjects)

```bash
pnpm migrate:mongo-objects <path-to-wobjects.json> [--skip-indexes]
```

`--skip-indexes` drops `object_updates` indexes and the search-vector trigger before bulk insert, then recreates them. Use for large files.

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

Each document should follow legacy **`MutedUserSchema`**: `mutedBy` (who muted) and `userName` (muted account). These map to PostgreSQL `user_account_mutes` as `(muter, muted)`. Optional fallbacks: `muter`/`muted`, or `follower`/`following`. Requires schema migration that creates `user_account_mutes`.

**Breaking rename:** the old script name `migrate:mongo` was replaced by `migrate:mongo-objects`.

## Post export mapping

Source shape: legacy Mongo [`PostSchema`](../../tmp/PostSchema.js). ODL columns: [`libs/core/src/db/odl/tables.ts`](../../libs/core/src/db/odl/tables.ts).

- **Skipped:** `blocked_for_apps`, singular `language`, `reblog_to`. Posts with both `title` and `body` empty after trim are ignored entirely (stat `postsSkippedEmptyTitleBody`).
- **`post_languages`:** `languages[]` may use regional tags (`en-US`). The importer stores the **primary language subtag** only (`en`), canonicalized with `Intl`, and dedupes per post (e.g. `en-US` + `en-GB` → one `en` row).
- **`post_objects`:** Built with the same merge rules as chain-indexer (`json_metadata.objects` or legacy `wobjects`, `tags` / `json_metadata.tags`, body `/object/...`). `object_type` from legacy `wobjects` when present. Rows are inserted only when `object_id` exists in `objects_core` (missing FKs are skipped; see migrator stats `postObjectsSkippedNoFk`).
- **`post_reblogged_users.reblogged_at_unix`:** Mongo stores only account names. The importer sets a single timestamp per post from, in order: `updatedAt`, `createdAt` (mongoose), `last_update` / `active` (parsed), else `created_unix` of the post.
- **`created_unix`:** `created` string, then mongoose `createdAt` / `updatedAt`, then `_id` ObjectId seconds.

Inserts use `ON CONFLICT DO NOTHING` on natural keys so re-runs are idempotent.

## User export mapping

Source: [`tmp/UserSchema.js`](../../tmp/UserSchema.js). ODL: [`libs/core/src/db/odl/tables.ts`](../../libs/core/src/db/odl/tables.ts).

- **`user_notification_settings.vote`:** from nested JSON `user_metadata.settings.userNotifications.like` (Mongo field name `like`; stored as column `vote` because `like` is a PostgreSQL reserved word).
- **`user_post_bookmarks`:** only entries in `user_metadata.bookmarks[]` containing `/` are split into `author` + `permlink`; others are skipped (object bookmarks not modeled).
- **`user_object_follows`:** only rows whose `object_id` exists in `objects_core` are inserted; see migrator stats `objectFollowsSkippedNoFk`.
- **`hive_id`, `comment_count`, `lifetime_vote_count`, `last_post`, `object_reputation`:** not present on Mongo user export; importer uses 0 / null defaults.

## Related

- Spec: [`docs/spec/data-model/posts.md`](../../docs/spec/data-model/posts.md), [`docs/spec/data-model/users.md`](../../docs/spec/data-model/users.md)
- Schema migrations: [`docs/operations/migrations.md`](../../docs/operations/migrations.md)
