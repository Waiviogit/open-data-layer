# dish

- **Object type name:** `dish`
- **Object description:** Dish or menu item with pricing and options.

- **supported_updates**

[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`category_item`](../object-updates/category_item.md)
[`delegation`](../object-updates/delegation.md)
[`description`](../object-updates/description.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`name`](../object-updates/name.md)
[`parent`](../object-updates/parent.md)
[`pin`](../object-updates/pin.md)
[`price`](../object-updates/price.md)
[`promotion`](../object-updates/promotion.md)
[`rating`](../object-updates/rating.md)
[`remove`](../object-updates/remove.md)
[`status`](../object-updates/status.md)
[`tag_category`](../object-updates/tag_category.md)
[`title`](../object-updates/title.md)

- **supposed_updates**

`rating`: "Presentation", "Taste", "Value"
`tag_category`: "Ingredients", "Category"

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
            object_id: 'dish1',
            object_type: 'dish'
          }
        }
      ]
    }),
  },
]

```
