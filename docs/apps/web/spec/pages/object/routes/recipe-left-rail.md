---
id: web-pages-object-routes-recipe-left-rail
title: Object page — recipe left rail
description: "Recipe-specific left-rail field order, labels, and view formatting."
type: spec
status: active
scope: web
tags: [web, page, object, recipe]
updated_at: 2026-08-26
related:
  - docs/apps/web/spec/pages/object/page-shell.md
  - docs/apps/web/spec/pages/object/routes/edit-mode.md
  - docs/apps/web/spec/pages/object/routes/category-feed.md
  - docs/apps/web/spec/pages/discover/page.md
---

# Object page — recipe left rail

**Back:** [page-shell](../page-shell.md) · **Related:** [edit-mode](edit-mode.md), [category-feed](category-feed.md)

## Purpose

Recipe objects use a dedicated left-rail sequence: **practical facts → explanation → classification → community signal → detailed recipe data**. Values render as stored on-chain strings (no client-side reformatting).

## View order

After optional menu cluster (when present):

| # | Block | Label | Notes |
|---|-------|-------|-------|
| 1 | `cookTime` | Cooking time | Raw text |
| 2 | `budget` | Budget | Raw text (e.g. `$`) |
| 3 | `calories` | Calories | Raw text |
| 4 | `nutrition` | Macros | Raw text |
| 5 | `description` | Description | Truncated preview + optional Description link |
| 6 | `tags` | Per category | Tag chips (discover links), same as other types |
| 7 | `category` | Categories | First 2 + **Show all categories** |
| 8 | `rating` | Ratings | Star rows per dimension |
| 9 | `ingredients` | Ingredients | Bulleted list; first 5 + **Show all {count} ingredients**; discover `q` cleaned via `cleanIngredientSearchQuery` (display stays raw) |
| 10 | `servings` | Servings | Raw text |
| 11+ | `gallery`, `featureList`, `identifier` | As populated | After servings |

Tag sections order: **Cuisine**, **Pros**, then remaining categories (`Meal Type`, `Diet`, custom).

Empty fields are omitted in view mode.

## Edit order

Matches view order after **Name** / **Title** and menu cluster. Includes empty slots with `+` for all recipe `supported_updates` that map to left-rail kinds (including **Budget**).

Order source: `RECIPE_ABOUT_SECTION_BLOCK_ORDER` in [`object-left-rail-order.ts`](../../../../../apps/web/src/modules/object/domain/object-left-rail-order.ts).

## Key files

| Area | Path |
|------|------|
| Order | `apps/web/src/modules/object/domain/object-left-rail-order.ts` |
| Projection | `apps/web/src/modules/object/infrastructure/projected-object-to-page-model.ts` |
| Ingredient search cleaner | `apps/web/src/modules/object/domain/clean-ingredient-search-query.ts` |
| Ingredients | `apps/web/src/modules/object/presentation/components/object-ingredients-left-rail-section.tsx` |
| Tags | `apps/web/src/modules/object/presentation/components/object-tags-left-rail-section.tsx` |
| Panel | `apps/web/src/modules/object/presentation/components/object-left-rail-panel.tsx` |

## Verification

```bash
pnpm nx test web --testPathPatterns=object-left-rail-order|projected-object-to-page-model|object-ingredients
```

Manual: `/object/fvf-korean-geotjeori-fresh-kimchi` — view and edit modes.
