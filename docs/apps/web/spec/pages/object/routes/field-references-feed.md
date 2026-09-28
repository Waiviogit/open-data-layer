---
id: web-pages-object-routes-field-references-feed
title: Object page — field references feed
description: Center-column feed for objects referencing a person or business via schema fields.
type: spec
status: active
scope: web
tags: [web, page, object, feeds]
updated_at: 2026-08-07
related:
  - docs/apps/web/spec/pages/object/routes/right-rail.md
  - docs/apps/query-api/spec/object-field-references.md
---

# Object page — field references feed

**Back:** [right-rail](right-rail.md)

## Routes

| Public URL | query-api |
|------------|-----------|
| `/object/:id/books` | `GET /query/v1/objects/:id/field-references/book` |
| `/object/:id/products` | `GET .../field-references/product` |
| `/object/:id/service-offers` | `GET .../field-references/service_offer` |
| `/object/:id/service-requests` | `GET .../field-references/service_request` |

Proxy rewrites to `?tab=field-references&field_reference_type=…` (singular API type).

## UI

- Component: `ObjectFieldReferencesListFeed` + `ObjectCard`
- Page size: `REF_LIST_PAGE_SIZE` (20)
- Load more: `field-references/load-more-field-references.actions.ts`

Not shown in primary nav — reached via right-rail **Show more** only.
