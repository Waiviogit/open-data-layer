# Discover page (`/discover`)

Browse objects by type or users with optional text search and tag-category filters (AND semantics).

## Routes

| URL | Mode |
|-----|------|
| `/discover?type={object_type}` | Object feed for one registry type |
| `/discover?users=1` | User list (optional `q` prefix search) |
| `q`, `tags`, `sort` | Shared query params |

## API (via BFF)

| BFF | query-api |
|-----|-----------|
| `GET /api/discover/objects` | `GET /query/v1/discover/objects` |
| `GET /api/discover/users` | `GET /query/v1/discover/users` |
| `GET /api/discover/tag-categories` | `GET /query/v1/discover/tag-categories` |

### Object feed

- Filters: `object_type`, optional FTS `q`, `tags[]` (each tag = `category:value` encoding, e.g. `Cuisine:asian`; AND across all selected tags; both `value_json.category` and `value_json.value` must match).
- Sort: `newest` (default, `objects_core.seq DESC`), `oldest`, `rank` (`weight DESC`).
- Cursor: opaque base64 JSON (`seq`, `weight`, `object_id`, `sort`).
- Cards: projected with shop card update types (`name`, `image`, `description`, `tagCategoryItem`, `aggregateRating`).

### Tag categories sidebar

- Aggregated from `object_updates` where `update_type = tagCategoryItem`, grouped by `value_json.category` / `value_json.value`.
- Redis cache: `query-api:cache:tag-categories:{objectType}` (TTL 300s).
- Section order follows `supposed_updates` TAG_CATEGORY values in `@opden-data-layer/core` object-type registry.

### Indexes

Migration `00013_discover_indexes`: expression index on tag item `(value, category)`; `(object_type, seq DESC)` on active `objects_core`.

## Search integration

Header search dropdown tabs (per `object_type` and Users) link to `/discover` with `q` and `type` / `users=1`. The **All** tab was removed.

## Object page tags

On `/object/:object_id`, tag chips in the left rail **Tags** block link to `/discover?type={object_type}&tags={category}:{value}` (e.g. `Cuisine:asian`) where `object_type` is `ObjectPageViewModel.objectTypeKey` (registry key from query-api, e.g. `recipe`). Legacy value-only `tags` in the URL are ignored by query-api.

## Verification

```bash
pnpm nx test query-api --testPathPattern=discover
pnpm nx test web --testPathPattern=discover
```
