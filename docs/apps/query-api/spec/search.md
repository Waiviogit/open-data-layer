# Search endpoints

Predictive search for the web shell header: ranked **objects** and **users**. Global tab counts are loaded separately for performance.

## HTTP

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/query/v1/search` | Optional `X-Viewer` for follower state on user rows and projection context |
| `GET` | `/query/v1/search/counts` | None required (counts do not depend on viewer or locale) |

### Query parameters — `GET /search`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | yes | Search text, 1–100 chars after trim. |
| `limit` | integer | no | Max **object** hits (default `10`, max `20`). User hits are capped at **5** regardless. |

### Query parameters — `GET /search/counts`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | yes | Same search text as `/search`. |

### Headers — `GET /search`

| Header | Description |
|--------|-------------|
| `X-Locale` / `Accept-Language` | Locale for object resolution (same as other read routes). |
| `X-Viewer` | Optional Hive account; used for `users[].is_following` and `ObjectProjectionService` authority context. |
| `X-Governance-Object-Id` | Optional; merged into governance snapshot for resolution/projection (same as `POST /objects/resolve`). |

## Response — `GET /search`

`SearchResponseDto`:

- **`objects`**: Array of `SearchObjectResult` — `object_id`, `object_type`, `name`, `image_url`, `parent_name` (subtitle in UI when present).
- **`users`**: Array of `SearchUserResult` — `name`, `profile_image`, `reputation` (`object_reputation`), `followers_count`, `is_following`.

No `type_counts` or `total_users` — use `/search/counts` for tab badges.

## Response — `GET /search/counts`

`SearchCountsResponseDto`:

- **`type_counts`**: Map of `object_type` → count of **all** unique active objects in the DB matching `q` (one per `meta_group_id`, highest weight representative semantics aligned with search dedup).
- **`total_users`**: Total users matching the name prefix for `q` (not capped at 5).

## Query plan — objects (`/search` and `/search/counts`)

1. **FTS-first (autocomplete):** `object_updates` rows with `update_type` in (`name`, `title`, `description`) and `search_vector @@ to_tsquery('english', :ts_query)` (GIN on `search_vector`). `:ts_query` is built from `:q` so every token is required (`&`) and the **last** token is a prefix (`:*`), e.g. `Oeb Brea` → `oeb & brea:*` matches "Oeb Breakfast". → distinct `object_id` candidates.
2. **Optional id substring** (only when `trim(q)` has length ≥ 8 and contains `-`): `objects_core` with `status = 'active'` and `object_id ILIKE '%' || escape(:q) || '%' ESCAPE '\'`. Omitted for short text queries (e.g. `grampo`) to avoid a full-table scan.
3. Union FTS (and optional id) candidate ids; **join** `objects_core` on PK (`status = 'active'`).
4. **`/search`:** `DISTINCT ON (COALESCE(meta_group_id, object_id))` with `ORDER BY` that expression, then `objects_core.weight DESC NULLS LAST`, `LIMIT :limit`. Then load aggregates, resolve, project.
5. **`/search/counts`:** `GROUP BY object_type` with `COUNT(DISTINCT COALESCE(meta_group_id, object_id))`.

Object SQL and user SQL for `/search` run **in parallel** in `GetSearchEndpoint`. `/search/counts` runs `countObjectsByType` and `countUsers` in parallel in `GetSearchCountsEndpoint`.

## Query plan — users (`/search`)

1. `accounts_current` where `name >= lower(escape(:q))` and `name < upperBound(prefix)` (btree range on PK; Hive names are stored lowercase).
2. Order by `wobjects_weight DESC NULLS LAST`, `followers_count DESC`.
3. Cap at **5** rows.
4. If `X-Viewer` is set, `is_following` = existence of `user_subscriptions (follower, following)`.

## Query plan — user count (`/search/counts`)

1. Same btree prefix range as user search.
2. `COUNT(*)` on `accounts_current` (no limit).

## Errors

Validation failures on query params return **400** (Zod pipe). Infrastructure failures in repositories log and return empty slices / zero counts where documented.
