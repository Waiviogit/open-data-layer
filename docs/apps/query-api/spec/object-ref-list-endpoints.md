# Object reference lists (`related`, `similar`, `add-on`)

**Back:** [query-api README](../README.md) · **Related:** [Objects resolve](objects-resolve.md), [User social lists](user-social-lists.md), [Shop categories](categories.md)

Paginated lists of objects linked to a source object for shop-style cards (Related / Similar / Add-On rails and center-column feeds).

## Routes

| Method | Path | Update type | Object types |
| ------ | ---- | ----------- | ------------ |
| `GET` | `/query/v1/objects/{objectId}/related` | `isRelatedTo` | Types with `isRelatedTo` in `OBJECT_TYPE_REGISTRY.supported_updates` |
| `GET` | `/query/v1/objects/{objectId}/similar` | `isSimilarTo` | Types with `isSimilarTo` in registry |
| `GET` | `/query/v1/objects/{objectId}/add-on` | `addOn` | Types with `addOn` in registry |

Returns **404** when `{objectId}` is missing or `objects_core.status ≠ active`.

## Query parameters

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `limit` | int | `20` | Page size, `1`–`50`. |
| `cursor` | string | — | Numeric offset for the next page (stringified integer). Omitted or invalid → `0`. |

Pagination is **offset-based**: `cursor` is the number of logical rows already consumed across explicit refs + backfill (not a stable opaque token).

## Headers

| Header | Purpose |
| ------ | ------- |
| `Accept-Language` / `X-Locale` | Locale for resolved ref field values. |
| `X-Governance-Object-Id` | Optional governance merge (same as `POST /objects/resolve`). |
| `X-Viewer` | Optional Hive account; sets `hasAdministrativeAuthority` on each `RefSummary` when the viewer has administrative authority on that ref object. |

## Response

```json
{
  "items": [
    {
      "object_id": "example-product",
      "object_type": "product",
      "fields": {
        "name": "Example",
        "image": "https://…",
        "description": "…",
        "tagCategoryItem": "…",
        "aggregateRating": []
      },
      "weight": 123.45,
      "hasAdministrativeAuthority": false
    }
  ],
  "hasMore": true,
  "cursor": "20"
}
```

### `RefSummary` fields

Each item is a compact projection (not full `ProjectedObject`):

| Field | Description |
| ----- | ----------- |
| `object_id`, `object_type` | Target object identity. |
| `fields` | Subset from `REF_SUMMARY_UPDATE_TYPES`: `name`, `image`, `description`, `tagCategoryItem`, `aggregateRating` (same aspect-row shape as resolve). |
| `weight` | `objects_core.weight` (nullable). |
| `addedAtUnix` | Present when sourced from an explicit ref update (optional). |
| `listItemsCount` | Recursive list-item count when applicable (optional). |
| `hasAdministrativeAuthority` | Viewer-specific when `X-Viewer` is set. |

Inactive or missing ref targets are **omitted** from `items` (page may be shorter than `limit`).

## Resolution order

Implemented in `GetObjectRefListEndpoint` + `resolveObjectRefIds`:

1. Load source object; resolve **only** the requested update type (`isRelatedTo` | `isSimilarTo` | `addOn`) with locale + governance.
2. Collect **explicit** ref ids from VALID `value_text` rows on that field (deduped, order preserved).
3. Paginate: explicit ids first, then **backfill** if the page is not full.
4. Expand the page slice via `expandObjectRefs` and return rows in resolved id order.

### Explicit references

- Source: `object_updates` rows for the update type on `{objectId}` with `validity_status = VALID`.
- Ref id: `value_text` (trimmed).
- Pagination: `cursor`/`skip` applies to the combined explicit + backfill sequence.

### Category backfill (`related` and `similar` only)

When explicit refs do not fill the page, backfill uses `object_categories.category_names` on the **source** object.

Counts come from `object_categories_related` (global scope) with on-demand fallback counts from active `objects_core` + `object_categories`.

**Related** (legacy `getCloseProducts.getRelated`):

- Keep categories whose global count ≥ **average** count across the source object’s categories.
- Query objects whose categories **overlap** any kept category (`category_names && filtered`).
- Exclude source id, explicit ref ids, and `meta_group_id` groups already represented in explicit refs.
- Order: `weight DESC NULLS LAST`, `object_id ASC`.

**Similar** (legacy `getCloseProducts.getSimilar`):

- Sort source categories by count **ascending** (smallest first).
- For each category in order: take objects in that category only, excluding objects that share any **already-used** category (`NOT (category_names && usedDepartments)`).
- Same exclusions and ordering as related.

Pure functions: `apps/query-api/src/domain/objects/object-ref-list-backfill.ts`.

### Add-on backfill

When explicit `addOn` refs do not fill the page:

- Reverse lookup: active objects with VALID `addOn` update where `value_text = source object id`.
- Object types limited to registry types supporting `addOn`.
- Order: `weight DESC NULLS LAST`, `object_id ASC`.

## Code map

| Layer | Location |
| ----- | -------- |
| HTTP | `apps/query-api/src/controllers/objects.controller.ts` |
| Endpoint | `apps/query-api/src/domain/objects/get-object-ref-list.endpoint.ts` |
| Id resolution | `apps/query-api/src/domain/objects/resolve-object-ref-ids.ts` |
| SQL backfill | `apps/query-api/src/repositories/object-ref-list.repository.ts` |
| Ref projection | `apps/query-api/src/domain/object-projection/object-ref-expansion.ts` |
| Zod query/response | `apps/query-api/src/domain/objects/schemas/object-ref-list.schema.ts` |

## OpenAPI / Swagger

Registered in [`apps/query-api/src/openapi/objects.openapi.ts`](../../../../apps/query-api/src/openapi/objects.openapi.ts):

- Schemas: `RefSummary`, `ObjectRefListResponse`
- Paths: `GET .../related`, `GET .../similar`, `GET .../add-on`

Live docs when query-api is running: `/query/v1/docs` (JSON: `/query/v1/docs-json`).

## Client (web)

See [object right rail](../../web/spec/object/right-rail.md) and center-column feeds under the same paths (`/object/:id/related`, `/similar`, `/add-on`).
