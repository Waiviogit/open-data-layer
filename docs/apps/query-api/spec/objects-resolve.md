# Objects resolve (`POST /query/v1/objects/resolve`)

## `fields.aggregateRating`

When the `aggregateRating` update type is included in the resolve request, `fields.aggregateRating` is **always an array** (possibly empty) of aspect rows:

| Field | Meaning |
|-------|---------|
| `dimension` | Label for the aspect (from the update’s `value_text`). |
| `averageRating` | Mean rank score for that aspect’s `update_id`, **0–10000** scale, or **`null`** when unknown. |
| `userRating` | Same scale for the viewing account’s vote when the `X-Viewer` header names a Hive account and a matching `rank_votes` row exists; otherwise **`null`**. When multiple rows exist per aspect, the row with the greatest `event_seq` wins. |
| `totalVoters` | `COUNT(*)` of `rank_votes` rows for that aspect’s `update_id` in the batch scope. |

This shape is a **breaking change** for clients that expected the previous object with `dimensions` and a top-level `averageRating`.

See also: OpenAPI path description in `apps/query-api/src/openapi/objects.openapi.ts`.
