---
id: docs-apps-query-api-spec-objects-resolve-nested
title: Objects resolve-nested
description: "Batch lightweight nested object projections with optional update_types."
type: spec
status: active
scope: query-api
tags: [query-api, objects-resolve]
updated_at: 2026-06-30
related:
  - docs/apps/query-api/spec/objects-resolve.md
  - docs/apps/query-api/spec/overview.md
  - docs/spec/objects-domain.md
---

# Objects resolve-nested (`POST /query/v1/objects/resolve-nested`)

Batch lightweight projection for nested catalog navigation (object page menu, path stack). Returns `NestedObjectView` items: `object_id`, `object_type`, `fields`, optional `affiliateLinks` — no authority flags, SEO, galleries at top level, or social counts. See [affiliate-links.md](affiliate-links.md).

## Request body

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `ids` | yes | — | 1–32 object ids |
| `update_types` | no | nested defaults | See below |

## `update_types` semantics

| Value | Resolved update types |
|-------|----------------------|
| omitted | `listItem`, `sortCustom`, `pageContent`, `name` |
| `[]` | same as omitted (endpoint defaults) |
| `["name", "pageContent"]` | only the listed types |

Each element must be a key in `UPDATE_REGISTRY`; unknown values return **400**.

This differs from `POST /query/v1/objects/resolve`, where an empty `update_types` array means **all update types present on the object**.

## Ref expansion

When resolved fields contain `object_ref` values (e.g. inside `listItem`), referenced objects are expanded with the internal ref-summary update set (`name`, `image`, `parent`, `description`, `tagCategoryItem`, `aggregateRating`). That set is **not** controlled by `update_types` on this endpoint.

If `listItem` is not requested, refs inside list items are not collected or expanded.

## Related code

- Endpoint: `apps/query-api/src/domain/objects/get-nested-objects.endpoint.ts`
- Defaults: `apps/query-api/src/domain/objects/nested-object.constants.ts`
- OpenAPI: `apps/query-api/src/openapi/objects.openapi.ts`
