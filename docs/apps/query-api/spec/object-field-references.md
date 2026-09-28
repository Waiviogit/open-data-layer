---
id: docs-apps-query-api-spec-object-field-references
title: Object field references
description: Reverse lookup of objects that reference a person or business via schema fields (author, merchant, etc.).
type: spec
status: active
scope: query-api
tags: [query-api, object-field-references]
updated_at: 2026-08-07
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/object-ref-list-endpoints.md
  - docs/spec/objects-domain.md
---

# Object field references

**Back:** [query-api overview](overview.md) · **Related:** [Object ref lists](object-ref-list-endpoints.md)

Legacy Waivio right-rail **References**: objects that point at a `person` or `business` through schema `object_ref` fields (not `isRelatedTo` / `addOn`).

## Routes

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/query/v1/objects/{objectId}/field-references` | Preview groups for right rail (default 6 per group) |
| `GET` | `/query/v1/objects/{objectId}/field-references/{referenceObjectType}` | Paginated list for one target type |

Returns **404** when `{objectId}` is missing or `objects_core.status ≠ active`.

Returns **422** when source type is not `person` or `business`, or `{referenceObjectType}` is not allowed for that source.

## Source rules

| Source type | Target groups | Update types on targets |
| ----------- | ------------- | ----------------------- |
| `person` | `book` | `author` |
| `business` | `product`, `book`, `service_offer`, `service_request` | `merchant`, `manufacturer`, `brand`, `publisher`, `provider` |

## Query parameters

Summary (`field-references`):

| Param | Default | Description |
| ----- | ------- | ----------- |
| `limit` | `6` | Preview size per group (1–50) |

By type (`field-references/:referenceObjectType`): same as [object ref lists](object-ref-list-endpoints.md) — `limit` (default 20), `cursor` (numeric offset).

## Headers

Same as object ref lists: `Accept-Language` / `X-Locale`, optional `X-Governance-Object-Id`, `X-Viewer`.

## Response

Summary:

```json
{
  "groups": [
    {
      "objectType": "book",
      "items": [ /* RefSummary */ ],
      "hasMore": true
    }
  ]
}
```

By type: `ObjectRefListResponse` (`items`, `hasMore`, `cursor`).

## Resolution

1. Load source object; require `person` or `business`.
2. **Index-friendly reverse lookup** — CTE `matched` selects distinct `object_id` from `object_updates` where `value_text = sourceObjectId` and `update_type IN (…)` (uses `idx_object_updates_update_type_value_text`).
3. **Variant collapse** — CTE `picked`: join `matched` → `objects_core`, filter `status = active` and target `object_type`, then `DISTINCT ON (COALESCE(meta_group_id, object_id))` ordered by `weight DESC NULLS LAST` within each group.
4. **Global pagination** — outer query orders `picked` rows by `weight DESC NULLS LAST, object_id ASC`, then `OFFSET` / `LIMIT`.
5. Expand page slice via `expandObjectRefs` (`RefSummary` fields).

**Not filtered in v1:** legacy Mongo field `weight > 0` on the referencing field row (no ODL equivalent). `objects_core.weight` is used for ordering only.

**Validity:** same limitation as reverse add-on backfill — `EXISTS` on `object_updates` without resolving VALID winners at SQL time.

## Code map

| Layer | Location |
| ----- | -------- |
| Rules | `apps/query-api/src/domain/objects/object-field-reference-rules.ts` |
| HTTP | `apps/query-api/src/controllers/objects.controller.ts` |
| Endpoints | `apps/query-api/src/domain/objects/get-object-field-references.endpoint.ts` |
| SQL | `apps/query-api/src/repositories/object-field-references.repository.ts` |

## Client (web)

See [object right rail](../../web/spec/pages/object/routes/right-rail.md) and [field references feed](../../web/spec/pages/object/routes/field-references-feed.md).
