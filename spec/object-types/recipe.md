# recipe

- **Object type name:** `recipe`
- **Object description:** Recipe or cooking instructions with ingredients.

- **supported_updates**

[`status`](../object-updates/status.md)
[`avatar`](../object-updates/avatar.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`name`](../object-updates/name.md)
[`title`](../object-updates/title.md)
[`description`](../object-updates/description.md)
[`background`](../object-updates/background.md)
[`delegation`](../object-updates/delegation.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`rating`](../object-updates/rating.md)
[`calories`](../object-updates/calories.md)
[`budget`](../object-updates/budget.md)
[`cooking_time`](../object-updates/cooking_time.md)
[`add_on`](../object-updates/add_on.md)
[`similar`](../object-updates/similar.md)
[`features`](../object-updates/features.md)
[`cost`](../object-updates/cost.md)
[`recipe_ingredients`](../object-updates/recipe_ingredients.md)
[`identifier`](../object-updates/identifier.md)
[`departments`](../object-updates/departments.md)
[`promotion`](../object-updates/promotion.md)
[`nutrition`](../object-updates/nutrition.md)

- **supposed_updates**

`rating`: "Rating"
`tag_category`: "Cuisine", "Meal Type", "Diet"

- **Example payload for broadcast**

```js
[
  'custom_json',
  {
    required_auths: [],
    required_posting_auths: [account],
    id: 'odl-mainnet',
    json: JSON.stringify({
      events: [
        {
          action: 'object_create',
          v: 1,
          payload: {
            object_id: 'recipe1',
            object_type: 'recipe'
          }
        }
      ]
    }),
  },
]

```
