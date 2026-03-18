# recipe

- **Object type name:** `recipe`
- **Object description:** Recipe or cooking instructions with ingredients.

- **supported_updates**

[`add_on`](../object-updates/add_on.md)
[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`budget`](../object-updates/budget.md)
[`calories`](../object-updates/calories.md)
[`category_item`](../object-updates/category_item.md)
[`cooking_time`](../object-updates/cooking_time.md)
[`cost`](../object-updates/cost.md)
[`delegation`](../object-updates/delegation.md)
[`departments`](../object-updates/departments.md)
[`description`](../object-updates/description.md)
[`features`](../object-updates/features.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`identifier`](../object-updates/identifier.md)
[`name`](../object-updates/name.md)
[`nutrition`](../object-updates/nutrition.md)
[`pin`](../object-updates/pin.md)
[`promotion`](../object-updates/promotion.md)
[`rating`](../object-updates/rating.md)
[`recipe_ingredients`](../object-updates/recipe_ingredients.md)
[`remove`](../object-updates/remove.md)
[`similar`](../object-updates/similar.md)
[`status`](../object-updates/status.md)
[`tag_category`](../object-updates/tag_category.md)
[`title`](../object-updates/title.md)

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
