---
id: docs-apps-query-api-spec-category-objects
title: Category objects feed
description: "Global paginated feed of active objects whose materialized department path contains a given category name."
type: spec
status: active
scope: query-api
tags: [query-api, categories]
updated_at: 2026-07-10
related:
  - docs/apps/query-api/spec/categories.md
  - docs/apps/query-api/spec/object-ref-list-endpoints.md
---

# Category objects (`GET /categories/objects`)

**Back:** [Categories](categories.md) · **Related:** [object ref lists](object-ref-list-endpoints.md) · [affiliate links](affiliate-links.md)

## Purpose

Return a global feed of active objects that have a given **department** category name in `object_categories.category_names` (array overlap / contains). Used by the object page left-rail category links.

**Data dependency:** results come from the chain-indexer materialized `object_categories` table (`ObjectCategoriesWorker`). Objects without a synced row never appear in the feed even when live resolve shows `fields.category` on the host page. Run indexer backfill / wait for `object_categories_sync_queue` on new environments.

This is **not** `tagCategoryItem` discover filtering — department names come from the `category` update type.

## Endpoint

`GET /query/v1/categories/objects`

| Param | Required | Role |
|-------|----------|------|
| `name` | yes | Category string; objects where `category_names && ARRAY[name]` |
| `limit` | no | 1–50, default 20 |
| `cursor` | no | Keyset cursor (`weight` + `object_id`, base64url JSON) |
| `exclude_object_id` | no | Omit one object id (e.g. host object on object page) |

Headers: `Accept-Language`, `X-Viewer`, `X-Governance-Object-Id` (same as other object feeds).

## Response

Same compact card shape as related/similar/add-on ref lists (`RefSummary[]`):

```json
{
  "items": [{ "object_id": "...", "object_type": "product", "fields": { ... }, "weight": 1.2 }],
  "hasMore": true,
  "cursor": "..."
}
```

## Query rules

- Active objects only (`objects_core.status = 'active'`).
- Variant collapse: `DISTINCT ON (COALESCE(meta_group_id, object_id))` keeping highest weight per group.
- Sort: `weight DESC NULLS LAST, object_id ASC`.
- Pagination: keyset on `(weight, object_id)` — invalid cursor is treated as first page.

## Implementation

| Layer | Path |
|-------|------|
| Controller | `apps/query-api/src/controllers/categories.controller.ts` |
| Endpoint | `apps/query-api/src/domain/categories/get-category-objects.endpoint.ts` |
| Repository | `apps/query-api/src/repositories/object-categories.repository.ts` (`findObjectIdsByCategoryName`) |

## Web consumer

Object page route `/object/:id/category/:encodedName` — see `docs/apps/web/spec/pages/object/routes/category-feed.md`.
