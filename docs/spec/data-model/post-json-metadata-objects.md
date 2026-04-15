# Post `json_metadata`: linked objects (`post_objects`)

Normative for **chain-indexer** when indexing Hive `comment` operations for **root posts** (`parent_author === ''`). Parsed metadata is the JSON object inside `comment.json_metadata` (see [`json-metadata.util.ts`](../../../apps/chain-indexer/src/domain/hive-comment/json-metadata.util.ts) in chain-indexer).

Related: [`posts.md`](posts.md) (`post_objects` table), [`schema.sql`](schema.sql).

## Fields

### `objects` (optional)

Array of manual reward / weight assignments:

```json
[
  { "object_id": "author/slug-or-id", "percent": 30 }
]
```

- `object_id` (string, required per entry): Waivio-style id (matches `objects_core.object_id`). Legacy **`author_permlink`** is accepted as an alias for the same field.
- `percent` (number, required per entry): Integer-like share; coerced with rounding like legacy wobjects.

**Legacy `wobjects` is not read** by the indexer. Clients must send `objects`.

### `tags` (Hive)

Hive stores **`tags` as `string[]`** (categories / hashtags). For indexing, each **non-empty** string after trim is treated as an **`object_id` candidate** with **`percent: 0`** (discovery-only link).

### Body

- Paths matching `/object/<object_id>` anywhere in the text (including inside full URLs such as Waivio links) add **`object_id`** with **`percent: 0`** unless overridden by `objects`. The indexer uses a shared pattern (`OBJECT_PATH_BODY_RE` in [`comment-post-object-candidates.ts`](../../../apps/chain-indexer/src/domain/hive-comment/comment-post-object-candidates.ts)).
- **`#hashtags` in the post body** add **`object_id`** tokens (same `#…` rules as comment binding: see `RE_HASHTAGS` in that module) with **`percent: 0`** unless overridden by `objects`.

## Merge order (same `object_id` from several sources)

1. Apply **`tags`** (each → `percent: 0`).
2. Add **`/object/...`** hits from the body (`percent: 0` if not already present).
3. Add **body `#hashtags`** (`percent: 0` if not already present).
4. Apply **`objects` last** so **manual percents win** over `tags` and body-derived ids.

After merge and dedup, the indexer keeps at most **100** linked objects per post (`MAX_POST_OBJECTS_PER_POST` in [`post-objects.ts`](../../../apps/chain-indexer/src/constants/post-objects.ts)). Extra entries are dropped in `Map` iteration order (roughly: tags in array order, then new body paths, then hashtags, then `metadata.objects` entries).

## Comment-driven binding to the parent post

For **non-root** Hive `comment` operations (`parent_author` and `parent_permlink` set), chain-indexer may **append** additional `post_objects` rows for the **parent root post** when the **comment body** mentions Waivio objects:

- **Guards:** skipped when `parent_author` is a thread host account (`leothreads`, `ecency.waves`), or when `(parent_author, parent_permlink)` matches a row in **`threads`** (thread-style parent, including cases beyond thread host accounts).
- **Parent post:** bindings use the parent’s **`author` / `permlink`** (the blog post being commented on). If the parent is **not** in `posts`, the indexer may **restore** it from Hive via `getContent` **only** when **`depth === 0`** (a root post). If the parent is a comment (`depth > 0`), no binding runs.
- **Candidates:** same extraction as root-post body handling — **`#hashtags`** plus **`/object/…`** segments (including in URLs), deduped (`extractObjectIdsFromCommentBody`).
- **Resolution:** only `object_id` values present in **`objects_core`** are inserted; `object_type` is denormalized from core.
- **Existing links:** new ids are those not already in `post_objects` for that post. **`percent: 0`** for appended rows.
- **Cap:** at most **`MAX_POST_OBJECTS_PER_POST`** total objects per post; only **remaining** slots are filled.
- **Idempotency:** inserts use **`ON CONFLICT DO NOTHING`** on `(author, permlink, object_id)` so replays do not error.

## Persistence (`post_objects`)

Rows are written only for `object_id` values that **exist in `objects_core`** at index time. The indexer loads `object_type` from `objects_core` and denormalizes it onto `post_objects.object_type`. Unknown ids are **dropped** (no insert).

## Percent sum validation

Waivio-style rule: the **sum of all `percent` values** on the merged list must be in **`[0, 101]`** (see `validateWobjectPercentSum` in chain-indexer). Zeros from `tags` / body count toward the sum.

## Mongo import (historical)

One-off `pnpm migrate:mongo-posts` may map legacy `wobjects` into the same merge shape and does **not** apply the indexer’s `objects_core` existence filter (historical denormalized import).
