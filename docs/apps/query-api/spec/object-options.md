---
id: docs-apps-query-api-spec-object-options
title: Object variant options
description: Aggregated product variant options grouped by category across meta_group_id siblings.
type: spec
status: active
scope: query-api
tags: [query-api, object-options]
updated_at: 2026-07-09
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/objects-resolve.md
  - docs/apps/query-api/spec/object-ref-list-endpoints.md
---

# Object variant options

**Back:** [query-api overview](overview.md) · **Related:** [Objects resolve](objects-resolve.md), [Object reference lists](object-ref-list-endpoints.md)

Returns option rows grouped by category (Color, Size, …) for a product variant object and all active siblings sharing the same `objects_core.meta_group_id`.

Supported object types: any type in `OBJECT_TYPE_REGISTRY` whose `supported_updates` includes `option` (notably **`product`**, **`book`**, **`service`**).

## Route

| Method | Path |
| ------ | ---- |
| `GET` | `/query/v1/objects/{objectId}/options` |

Returns **404** when `{objectId}` is missing or not active.

When the object type does not support the `option` update in `OBJECT_TYPE_REGISTRY`, returns **200** with `{ object_id, options: {} }` (no aggregation).

## Headers

Same as other object read endpoints: `Accept-Language` / `X-Locale`, optional `X-Governance-Object-Id`, optional `X-Viewer`.

Locale affects projected option/price/image fields the same way as resolve.

## Sibling selection

1. Load the requested `object_id` first.
2. Load up to **127** additional active siblings (`OPTIONS_SIBLING_CAP = 128` total) with the same `meta_group_id`, excluding the requested id.
3. Siblings are ordered **`weight DESC NULLS LAST`**, then **`object_id ASC`** (deterministic).
4. Projection and aggregation preserve that sibling order so duplicate values per category dedupe with a stable “first wins” `object_id`.

Large product groups beyond the cap return options for the capped subset only.

## Response

```json
{
  "object_id": "variant-a",
  "options": {
    "Color": [
      {
        "object_id": "variant-a",
        "category": "Color",
        "value": "Boulder",
        "position": 1,
        "image": "https://…",
        "price": "99.00",
        "imageUrl": "https://…"
      }
    ],
    "Size": [
      {
        "object_id": "variant-b",
        "category": "Size",
        "value": "11",
        "position": 1,
        "image": null,
        "price": "99.00",
        "imageUrl": "https://…"
      }
    ]
  }
}
```

- Values are deduped per category by `value` (first sibling in load order wins).
- Sorted by `position`, then `value` (locale-aware).
- `object_id` on each entry is the variant object that owns that option value (used for navigation in the web UI).

Rank vote projection is **not** loaded on this path (`includeRankVoteProjection: false`).

## Implementation

| Piece | Path |
| ----- | ---- |
| Endpoint | `apps/query-api/src/domain/objects/get-object-options.endpoint.ts` |
| Aggregator | `apps/query-api/src/domain/objects/object-options-aggregator.ts` |
| Sibling lookup | `ObjectsCoreRepository.findObjectIdsByMetaGroupId` |
| Index | `idx_objects_core_meta_group_id_active` (migration `00036_objects_core_meta_group_id_index`) |
| MCP tool | `get_object_options` |

## Verification

```bash
pnpm nx test query-api --testFile=apps/query-api/src/domain/objects/get-object-options.endpoint.spec.ts
```
