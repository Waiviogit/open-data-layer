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

Paths matching `/object/<slug>` (see chain-indexer regex) add **`object_id`** with **`percent: 0`** unless overridden by `objects`.

## Merge order (same `object_id` from several sources)

1. Apply **`tags`** (each → `percent: 0`).
2. Add **`/object/...`** hits from the body (`percent: 0` if not already present).
3. Apply **`objects` last** so **manual percents win** over `tags` and body.

After merge and dedup, the indexer keeps at most **100** linked objects per post (`MAX_POST_OBJECTS_PER_POST` in [`post-objects.ts`](../../../apps/chain-indexer/src/constants/post-objects.ts)). Extra entries are dropped in `Map` iteration order (roughly: tags in array order, then new body paths, then `metadata.objects` entries).

## Persistence (`post_objects`)

Rows are written only for `object_id` values that **exist in `objects_core`** at index time. The indexer loads `object_type` from `objects_core` and denormalizes it onto `post_objects.object_type`. Unknown ids are **dropped** (no insert).

## Percent sum validation

Waivio-style rule: the **sum of all `percent` values** on the merged list must be in **`[0, 101]`** (see `validateWobjectPercentSum` in chain-indexer). Zeros from `tags` / body count toward the sum.

## Mongo import (historical)

One-off `pnpm migrate:mongo-posts` may map legacy `wobjects` into the same merge shape and does **not** apply the indexer’s `objects_core` existence filter (historical denormalized import).
