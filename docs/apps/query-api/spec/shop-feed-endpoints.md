---
id: docs-apps-query-api-spec-shop-feed-endpoints
title: Shop / recipe object feeds
description: "- `GET /query/v1/users/:name/shop-objects` — flat `ProjectedObject[]` in user shop scope with `categoryPath` filter, optional `uncategorizedOnly=true` (objects with no `category_names`), and `object_id` cursor. - `GET /query/v1/users/:name/shop-sections` — grouped preview rows (`sectionLimit` categories per page, 3 objects per category) for intermediate category nodes; cursor is the last category `name` from the previous page (same ordering as `GET .../categories`)."
type: spec
status: active
scope: query-api
tags: [query-api, shop-feed-endpoints]
updated_at: 2026-10-22
related:
  - docs/apps/query-api/spec/overview.md
  - docs/README.md
---

# Shop / recipe object feeds

**Endpoints:**

- `GET /query/v1/users/:name/shop-objects` — flat `ProjectedObject[]` in user shop scope with `categoryPath` filter, optional `uncategorizedOnly=true` (objects with no `category_names`), optional `tags[]` (`category:value`, AND) and optional `rating` (`6` | `8` | `10` legacy threshold), and `object_id` cursor.
- `GET /query/v1/users/:name/shop-sections` — grouped preview rows (`sectionLimit` categories per page, 3 objects per category) for intermediate category nodes; cursor is the last category `name` from the previous page (same ordering as `GET .../categories`). Optional `tags[]` and `rating` omit categories with zero matches (API/MCP); the web profile UI uses `shop-objects` instead when filters are active.
- `GET /query/v1/users/:name/shop/filters` — tag category facets (counts scoped to user shop membership and current `categoryPath`) plus static rating thresholds `[10, 8, 6]`. Optional `tags[]` and optional `rating` narrow facet counts (AND / minimum threshold).

**Rating filter SQL:** `rating=6|8|10` maps to ODL `rank_score >= threshold × 1000` on any `aggregateRating` update. Uses persisted `object_updates.rank_score`, or mean `rank_votes.rank` when score is null (same fallback as object projection). Legacy Mongo `average_rating_weight` (0–10) is migrated to `rank_score` during import.

**Scope:** Same membership as `object_categories_related` user scopes (`object_favorite` ∪ `object_ownership` ∪ optional `post_objects` branch per `user_metadata.hide_linked_objects` / `hide_recipe_objects` and `user_shop_deselect`). Types bucket: `book`+`product` (shop) or `recipe`. Both favorite and ownership apply `object_type IN types` (same as `post_objects`).

**Projection:** `ObjectViewService` with update types including `identifier`; then `ObjectProjectionService.batchProject`. Optional `country` + GeoIP build [affiliate links](affiliate-links.md).

**Client:** Profile `user-shop` and `recipe` central column (`apps/web`): leaf URLs and **any URL with active `tags`/`rating` filters** load `shop-objects` (flat list); non-leaf browse without filters loads `shop-sections`. Sidebar link **Uncategorized** routes to `…/uncategorized` with `uncategorizedOnly=true`. Right column (`ProfileShopFilters`) loads facets from `GET …/shop/filters`; active filters are URL query params `tags` and `rating`.

**See also:** [Shop categories](categories.md), [docs/apps/chain-indexer/spec/object-categories.md](../../chain-indexer/spec/object-categories.md).
