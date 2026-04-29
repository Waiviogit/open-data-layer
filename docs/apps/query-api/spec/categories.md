# Categories (`GET /users/:name/categories`)

**Back:** [Query API overview](../overview.md) · **Related:** [chain-indexer object-categories](../../chain-indexer/spec/object-categories.md)

## Purpose

Read **pre-aggregated** shop department data for a Hive account from `object_categories_related` (`scope_type = 'user'`, `scope_key = buildUserScopeKey(name, types)`).

## Endpoint

`GET /query/v1/users/{name}/categories`

Query string (all optional except noted):

| Param | Role |
|-------|------|
| `types` | Repeatable; object-type bucket for **`scope_key`** (default **`book`** + **`product`**); e.g. `recipe` for the recipe bucket. Must match indexer precomputations (`SHOP_TYPE_BUCKETS` in `@opden-data-layer/core`). |
| `name` | Parent category for level ≥ 2 (omit = root). |
| `path` | Repeatable; ancestors before `name` when drilling down. |
| `excluded` | Repeatable; names to hide from the sibling list. |

Response: `items[]` with `name`, `objects_count`, `has_children`; `uncategorized_count` (from sentinel `__uncategorized__`); root-only `show_other` when more than **20** greedy top rows exist.

Implementation: [`GetUserCategoriesEndpoint`](../../../apps/query-api/src/domain/categories/get-user-categories.endpoint.ts), filters [`level1-filter.ts`](../../../apps/query-api/src/domain/categories/level1-filter.ts), [`level2-filter.ts`](../../../apps/query-api/src/domain/categories/level2-filter.ts).

## Root (no `name`)

1. Sort categories by **`objects_count`** descending.
2. **Greedy dominance:** do not add name **B** if **B** appears in **`related_names`** of any already accepted row (breadth-first preference for stronger / earlier names).
3. Cap at **20** (`ROOT_DEPARTMENTS_LIMIT`); **`show_other`** if more than **20** survived the greedy pass.
4. **`has_children`:** `hasDescendantBeyondLineage(nav, [cat])` — exists another row whose **`related_names`** contains that single name (co-occurrence ladder).

## Levels ≥ 2 (`name` set)

Let `ancestry = [...path, name]`.

1. Candidates **D** ≠ `name`, not `excluded`, and `ancestry.every(a => D.related_names.includes(a))`.
2. **`total`** = sum of `objects_count` among candidates; keep **D** where `objects_count/total` is in **(1%, 30%)** and **`objects_count > 10`**.
3. Sort by `objects_count` desc; drop **near-duplicate** pairs when both sides miss **< 10** group keys vs intersection (`GROUP_KEY_OVERLAP_TOLERANCE`, uses **`group_keys`**; empty **`group_keys`** skips dedup).
4. **`has_children`:** some row passes `lineage = [...path, name, D]`.

Uncategorized is only counted at the **root** response.

## Global scope

Aggregator and global read path are reserved for a future endpoint; table shape is already defined (`scope_type = 'global'`).
