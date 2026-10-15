---
title: Create recipe object
description: Agent playbook for ODL recipe object_create — ingredients, servings, cook time, nutrition, categories, budget, images.
type: playbook
status: active
scope: platform
tags: [object-create, object-create-playbook, recipe, agent]
related:
  - docs/skills/object-content-standards.md
  - docs/skills/object-content-routing.md
  - docs/skills/restaurant-menu-workflow.md
  - docs/skills/companion-post-workflow.md
---

# Create recipe object

Recipe or cooking instructions with ingredients.

## When to use / not

- **Use** for standalone recipes with ingredients, cook time, and nutrition.
- **Use** `dish` when the primary goal is a restaurant menu item with price (no full recipe body).
- **Not** when a recipe object already exists — use `odl_build_update_create`.

## Product baseline fields

`name`, `description`, `image`, `ingredients` (from `get_object_create_playbook.required_updates`).

## Field semantics

| Update | Semantics |
|--------|-----------|
| `name` | Recipe title |
| `description` | Appetizing dish summary — **not** step-by-step instructions |
| `ingredients` | Multi-value JSON array; one ingredient per line (e.g. `🥚 2 eggs`) |
| `servings` | Yield or portion count (e.g. `4`, `4-6`, `Serves 6`) |
| `cookTime` | Total time (e.g. `15 mins`, `1 hr 30 mins`) |
| `calories` | Total calories (e.g. `291 Calories`) |
| `budget` | Cost to prepare: `$` (under $10), `$$` (under $100), `$$$` (under $1000) |
| `nutrition` | Per serving: proteins, fats, carbohydrates |
| `featureList` | Optional highlights |
| `identifier` | External SKU or canonical id when known |
| `category` | Shop navigation categories (plural, e.g. `Breakfasts`, `Eggs`) |
| `aggregateRating` | `Rating` dimension when reviews exist |

Schema details: `get_update_schema({ update_type })`.

### Cooking instructions → post, not object

The `recipe` object holds **catalog metadata** (title, summary, ingredients, times, nutrition). Step-by-step directions belong in a **Hive post**, not in `description` or other object fields.

**Order of work:**

1. Create the `recipe` object on chain (`name`, `description`, `ingredients`, `image`, …).
2. Publish a companion post with the full cooking guide — numbered steps, techniques, tips, photos between steps.
3. Link the post to the recipe via `json_metadata.objects` (see [companion post workflow](../companion-post-workflow.md) and [hive post create](../hive-post-create.md)).

Keep `description` as a short appetizing summary for cards and search. Put the full “how to cook” narrative in the post body.

## Categories and tags (soft)

**Shop `category`** (navigation): 5–10 plural items relevant to the recipe (e.g. `Breakfasts`, `Eggs`, `Omelet Recipes`).

**Discover tags** (`tagCategory` / `tagCategoryItem` from `supposed_updates`):

- `Cuisine` — e.g. `asian`, `mediterranean`
- `Meal Type` — e.g. `breakfast`, `dinner`
- `Diet` — e.g. `vegetarian`, `gluten-free`

`tagCategoryItem.category` must match registry names exactly.

## Locales

Follow [object content standards](../object-content-standards.md). Localizable: `name`, `description`, `ingredients`, `servings`, `calories`, `budget`, `nutrition`, tag `value`. Not localizable: `cookTime`, `identifier`, refs. Confirm per field via `get_update_schema`.

## Research and source hierarchy

1. Authoritative cookbooks or official brand recipes when available.
2. User-provided source — cite in companion post if publishing.
3. Generated content — allowed for description/ingredients only when user requests; mark as generated.
4. Never invent nutrition or calories without a source — omit instead.

## Images

- Square 1:1, pure white background, full dish visible (no crop).
- Commercial food photography brief: 50mm, f/8, sharp, no text/watermark.
- Reference images: use for ingredients/shape only; do not copy blur or defects.
- Upload to IPFS before broadcast.

## Special constraints

- Dedupe by name + key ingredients via search before create.
- Web-compatible `object_id` when linking from menus or sites.
- Do not paste full step-by-step instructions into object updates — use a linked post after the object exists.

## Verification

`resolve_object`:

- `fields.name`, `fields.description`, `fields.image`, `fields.ingredients`
- `fields.budget`, `fields.cookTime`, `fields.calories`, `fields.servings` when set
- Locale variants when bilingual

## Related workflows

- [Companion post workflow](../companion-post-workflow.md) — object linking add-on
- [Hive post create](../hive-post-create.md) — build + broadcast playbook
- [Restaurant menu workflow](../restaurant-menu-workflow.md) — when recipe is linked from a restaurant
- [Object content standards](../object-content-standards.md)
- [IPFS image upload](../ipfs-image-upload.md)
