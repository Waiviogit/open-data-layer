---
id: docs-apps-query-api-spec-search
title: Search endpoints
description: "Predictive search for the web shell header: ranked **objects** and **users**. Global tab counts are loaded separately for performance."
type: spec
status: active
scope: query-api
tags: [query-api, search]
updated_at: 2026-10-02
related:
  - docs/apps/query-api/spec/overview.md
  - docs/README.md
---

# Search endpoints

Predictive search for the web shell header: ranked **objects** and **users**. Global tab counts are loaded separately for performance.

## HTTP

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/query/v1/search` | Optional `X-Viewer` for follower state on user rows and projection context |
| `GET` | `/query/v1/search/counts` | None required (counts do not depend on viewer or locale) |
| `POST` | `/query/v1/search/objects-by-ids` | Optional `X-Viewer`, `X-Governance-Object-Id`, locale headers (same as `GET /search`) |

### Query parameters — `GET /search`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | yes | Search text, 1–100 chars after trim. |
| `limit` | integer | no | Max **object** hits (default `10`, max `20`). User hits are capped at **5** regardless. |
| `type` | `all` \| `objects` \| `users` | no | Default `all`. `objects` skips user search; `users` skips object FTS/projection. Web ref pickers use `users` / `objects` respectively. |

### Query parameters — `GET /search/counts`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | yes | Same search text as `/search`. |

### Headers — `GET /search`

| Header | Description |
|--------|-------------|
| `X-Locale` / `Accept-Language` | Locale for object resolution (same as other read routes). |
| `X-Viewer` | Optional Hive account; used for `users[].is_following` and `ObjectProjectionService` authority context. It does **not** affect object ranking. |
| `X-Governance-Object-Id` | Optional; merged into governance snapshot for resolution/projection (same as `POST /objects/resolve`). |

## Response — `GET /search`

`SearchResponseDto`:

- **`objects`**: Array of `SearchObjectResult` — `object_id`, `object_type`, `name`, `image_url`, `parent_name` (subtitle in UI when present).
- **`users`**: Array of `SearchUserResult` — `name`, `profile_image`, `reputation` (`object_reputation`, vote/sort only), `wobjects_weight` (`accounts_current.wobjects_weight` — user expertise for display), `followers_count`, `is_following`.

No `type_counts` or `total_users` — use `/search/counts` for tab badges.

## Request — `POST /search/objects-by-ids`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object_ids` | `string[]` | yes | 1–100 trimmed non-empty ids. Duplicates are deduped; response order follows first occurrence in the request. |

## Response — `POST /search/objects-by-ids`

`SearchObjectsByIdsResponseDto`:

- **`objects`**: Array of `SearchObjectResult` (same shape as `GET /search` object hits).

## Query plan — objects by ids (`POST /search/objects-by-ids`)

1. **`loadByObjectIds`** on `objects_core` PK (`status = 'active'`) — no FTS, no `meta_group_id` collapse.
2. Resolve + `ObjectProjectionService.batchProject` with update types `name`, `image`, `parent` (same as `/search` object cards).
3. Omit ids that are missing or inactive (no 404 on the batch).

## Response — `GET /search/counts`

`SearchCountsResponseDto`:

- **`type_counts`**: Map of `object_type` → count of **all** unique active objects in the DB matching `q` (one per `meta_group_id`, highest weight representative semantics aligned with search dedup).
- **`total_users`**: Total users matching the name prefix for `q` (not capped at 5).

## Query plan — objects (`/search` and `/search/counts`)

1. **FTS-first (autocomplete):** `object_updates` rows with `update_type` in (`name`, `title`, `description`) and `search_vector @@ to_tsquery('english', :ts_query)` (GIN on `search_vector`). `:ts_query` is built from `:q` so every token is required (`&`) and **each** token is a prefix (`:*`), e.g. `about waiv` → `about:* & waiv:*` (note: `english` stopwords like `about` are stripped, so this reduces to `waiv:*`). → distinct `object_id` candidates.
2. **Name/title prefix (relevance boost):** `object_updates` rows with `update_type` in (`name`, `title`) where `value_text_normalized LIKE lower(trim(:q)) || '%'` (trigram GIN `idx_object_updates_name_title_value_norm_trgm`, only when `trim(q)` length ≥ 3). Unlike FTS this keeps stopwords, so `about wai` matches the object literally named "About Waivio".
3. **Object id prefix** (when `trim(q)` length ≥ 3): `objects_core` with `status = 'active'` and `object_id COLLATE "C" >= lower(trim(:q)) AND object_id COLLATE "C" < upperBound(lower(trim(:q)))` (same `prefixUpperBound` as user search; `"C"` so kebab ids like `kvu-` are not an empty range under locale collation). Hyphens in `q` are also split before FTS (`kvu-` → `kvu:*`).
4. **Identifier / address locality prefix** (when `trim(q)` length ≥ 3): `object_updates` with `update_type = 'identifier'` and `lower(value_json->>'value') LIKE lower(trim(:q)) || '%'`, or `update_type = 'address'` and `lower(value_json->>'locality') LIKE lower(trim(:q)) || '%'` (partial btree indexes `idx_object_updates_identifier_value_lower`, `idx_object_updates_address_locality_lower`).
5. **Optional id substring** (only when `trim(q)` has length ≥ 8 and contains `-`): `objects_core` with `status = 'active'` and `object_id ILIKE '%' || escape(:q) || '%' ESCAPE '\'`. Omitted for short text queries (e.g. `grampo`, `kvu`) to avoid a full-table scan.
6. Union FTS + name/title-prefix + id prefix + identifier/locality + optional id substring candidate ids; **join** `objects_core` on PK (`status = 'active'`).
7. **`/search`:** Collapse variants with `DISTINCT ON (COALESCE(meta_group_id, object_id))`, keeping the highest-`weight` representative per group. Final order: **name/title prefix match** first, then **object_id prefix**, then **identifier/locality prefix**, then sort tier (multi-word / id-shaped queries only: exact object id > id prefix/substring > exact normalized text > FTS), then `objects_core.weight DESC NULLS LAST` (earned payouts), then `object_id` for deterministic paging. Ranking is viewer-independent. Single-token text queries use the fast FTS path (prefix flags, no sort tiers). No `ts_rank_cd` over the full GIN hit set. Then load aggregates, resolve, project.
8. **`/search/counts`:** `GROUP BY object_type` with `COUNT(DISTINCT COALESCE(meta_group_id, object_id))` over FTS + id prefix + identifier + locality (+ optional id substring) candidates; the name/title-prefix boost in step 2 affects `/search` ordering, not counts.

Object SQL and user SQL for `/search` run **in parallel** in `GetSearchEndpoint`. `/search/counts` runs `countObjectsByType` and `countUsers` in parallel in `GetSearchCountsEndpoint`.

## Query plan — users (`/search`)

1. `accounts_current` where `name >= lower(escape(:q))` and `name < upperBound(prefix)` (btree range on PK; Hive names are stored lowercase).
2. Order by **exact** `name = lower(trim(:q))` first, then `wobjects_weight DESC NULLS LAST`, `followers_count DESC`.
3. Cap at **5** rows.
4. If `X-Viewer` is set, `is_following` = existence of `user_subscriptions (follower, following)`.

## Query plan — user count (`/search/counts`)

1. Same btree prefix range as user search.
2. `COUNT(*)` on `accounts_current` (no limit).

## Errors

Validation failures on query params return **400** (Zod pipe). Infrastructure failures in repositories log and return empty slices / zero counts where documented.

## Discover endpoints

Used by the web `/discover` page (BFF proxies under `/api/discover/*`).

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/query/v1/discover/objects` | Optional `X-Viewer` |
| `GET` | `/query/v1/discover/users` | Optional `X-Viewer` |
| `GET` | `/query/v1/discover/tag-categories` | None |

### Query parameters — `GET /discover/objects`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `object_type` | string | no | Registry object type filter |
| `q` | string | no | Optional FTS within discover scope (max 100 chars) |
| `tags` | string[] | no | Tag filters (`category:value`), AND semantics |
| `sort` | `rank` \| `newest` \| `oldest` | no | Default `rank` |
| `box` | string | no | Map bounding box: `swLng,swLat,neLng,neLat` (WGS84). Objects must have a latest `geo` update intersecting `ST_MakeEnvelope(..., 4326)`. |
| `cursor` | string | no | Opaque pagination cursor |
| `limit` | integer | no | Default 20, max 50 |

Results collapse to **one row per `meta_group_id`** (`COALESCE(meta_group_id, object_id)`). The representative is the SKU that would appear first under the active sort among matching active objects: `rank` keeps highest `weight`, `newest`/`oldest` keep that group's newest or oldest `created_at`. Keyset cursor and `limit` apply after collapse.

### Query parameters — `GET /discover/tag-categories`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `object_type` | string | yes | Object type for facet listing |
| `q` | string | no | Optional text filter (same FTS rules as objects) |
| `tags` | string[] | no | Selected tags (AND) to narrow facets |
| `box` | string | no | Same bounding box as objects; facet counts respect the geographic predicate |

When `q`, any `tags`, or `box` is present, facet results are computed live and **not** read from or written to the per-`object_type` Redis cache key.

Facet `count` is the number of **distinct active groups** (`COUNT(DISTINCT COALESCE(objects_core.meta_group_id, object_id))`), not SKU rows. Inactive objects are excluded.
