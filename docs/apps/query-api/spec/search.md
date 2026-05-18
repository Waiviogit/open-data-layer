# Search endpoint (`GET /query/v1/search`)

Predictive search for the web shell header: ranked **objects** (full-text on `name` / `title` / `description` updates and/or substring match on `object_id`) and **users** (prefix match on account name).

## HTTP

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/query/v1/search` | Optional `X-Viewer` for follower state on user rows and projection context |

### Query parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | yes | Search text, 1–100 chars after trim. |
| `limit` | integer | no | Max **object** hits (default `10`, max `20`). User hits are capped at **5** regardless. |

### Headers

| Header | Description |
|--------|-------------|
| `X-Locale` / `Accept-Language` | Locale for object resolution (same as other read routes). |
| `X-Viewer` | Optional Hive account; used for `users[].is_following` and `ObjectProjectionService` authority context. |
| `X-Governance-Object-Id` | Optional; merged into governance snapshot for resolution/projection (same as `POST /objects/resolve`). |

## Response

`SearchResponseDto`:

- **`objects`**: Array of `SearchObjectResult` — `object_id`, `object_type`, `name`, `image_url`, `parent_name` (subtitle in UI when present).
- **`users`**: Array of `SearchUserResult` — `name`, `profile_image`, `reputation` (`object_reputation`), `followers_count`, `is_following`.
- **`type_counts`**: Map of `object_type` → count **among returned object rows** (for tab badges).
- **`total_users`**: Length of `users` (for Users tab count).

## Query plan — objects

1. From `objects_core` (`status = 'active'`).
2. Keep rows where **either**:
   - **FTS:** exists a row in `object_updates` for the same `object_id` with `update_type` in (`name`, `title`, `description`) and `search_vector @@ plainto_tsquery('english', :q)` (GIN on `search_vector`), **or**
   - **`object_id`:** `objects_core.object_id ILIKE '%' || escape(:q) || '%' ESCAPE '\'` (substring match).
3. **`DISTINCT ON (COALESCE(meta_group_id, object_id))`** with `ORDER BY` that expression, then `objects_core.weight DESC NULLS LAST` so one representative per product group — highest weight wins (see `apps/query-api/AGENTS.md` — Search deduplication by product group).
4. Limit to `limit` rows.
5. Load full aggregates via `AggregatedObjectRepository.loadByObjectIds` (five-query pipeline).
6. Resolve with `ObjectViewService` for update types: `name`, `image`, `parent`.
7. Project with `ObjectProjectionService.batchProject` so URLs and parent refs match public object pages.

## Query plan — users

1. `accounts_current` where `name ILIKE :prefix ESCAPE '\'` (prefix = escaped `q` + `%`).
2. Order by `wobjects_weight DESC NULLS LAST`, `followers_count DESC`.
3. Cap at **5** rows.
4. If `X-Viewer` is set, `is_following` = existence of `user_subscriptions (follower, following)`.

## Errors

Validation failures on query params return **400** (Zod pipe). Infrastructure failures in repositories log and return empty slices where documented.
