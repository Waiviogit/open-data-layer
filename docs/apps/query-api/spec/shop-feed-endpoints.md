# Shop / recipe object feeds

**Endpoints:**

- `GET /query/v1/users/:name/shop-objects` — flat `ProjectedObject[]` in user shop scope with `categoryPath` filter, optional `uncategorizedOnly=true` (objects with no `category_names`), and `object_id` cursor.
- `GET /query/v1/users/:name/shop-sections` — grouped preview rows (`sectionLimit` categories per page, 3 objects per category) for intermediate category nodes; cursor is the last category `name` from the previous page (same ordering as `GET .../categories`).

**Scope:** Same membership as `object_categories_related` user scopes (`object_authority` ∪ optional `post_objects` branch per `user_metadata.hide_linked_objects` / `hide_recipe_objects` and `user_shop_deselect`). Types bucket: `book`+`product` (shop) or `recipe`.

**Projection:** `ObjectViewService` with update types `name`, `image`, `description`, `tagCategoryItem`, `aggregateRating`; then `ObjectProjectionService.batchProject`.

**Client:** Profile `user-shop` and `recipe` central column (`apps/web`): leaf URLs load `shop-objects`; non-leaf load `shop-sections`. Sidebar link **Uncategorized** routes to `…/uncategorized` with `uncategorizedOnly=true`.

**See also:** [Shop categories](categories.md), [docs/apps/chain-indexer/spec/object-categories.md](../../chain-indexer/spec/object-categories.md).
