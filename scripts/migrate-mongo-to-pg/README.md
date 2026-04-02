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

### Objects (wobjects)

```bash
pnpm migrate:mongo-objects <path-to-wobjects.json> [--skip-indexes]
```

`--skip-indexes` drops `object_updates` indexes and the search-vector trigger before bulk insert, then recreates them. Use for large files.

### Posts

```bash
pnpm migrate:mongo-posts <path-to-posts.json>
```

**Breaking rename:** the old script name `migrate:mongo` was replaced by `migrate:mongo-objects`.

## Post export mapping

Source shape: legacy Mongo [`PostSchema`](../../tmp/PostSchema.js). ODL columns: [`libs/core/src/db/odl/tables.ts`](../../libs/core/src/db/odl/tables.ts).

- **Skipped:** `blocked_for_apps`, singular `language`, `reblog_to`.
- **`post_objects`:** `wobjects[].author_permlink` → `object_id`. Rows are inserted only when `object_id` exists in `objects_core` (missing FKs are skipped; see migrator stats `postObjectsSkippedNoFk`).
- **`post_reblogged_users.reblogged_at_unix`:** Mongo stores only account names. The importer sets a single timestamp per post from, in order: `updatedAt`, `createdAt` (mongoose), `last_update` / `active` (parsed), else `created_unix` of the post.
- **`created_unix`:** `created` string, then mongoose `createdAt` / `updatedAt`, then `_id` ObjectId seconds.

Inserts use `ON CONFLICT DO NOTHING` on natural keys so re-runs are idempotent.

## Related

- Spec: [`docs/spec/data-model/posts.md`](../../docs/spec/data-model/posts.md)
- Schema migrations: [`docs/operations/migrations.md`](../../docs/operations/migrations.md)
