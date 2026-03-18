# link

- **Object type name:** `link`
- **Object purpose:** Link or URL reference.

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
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`parent`](../object-updates/parent.md)
[`rating`](../object-updates/rating.md)
[`url`](../object-updates/url.md)
[`promotion`](../object-updates/promotion.md)

- **supposed_updates**

`rating`: "Safety", "Value"
`tag_category`: "Pros", "Cons"

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
            object_id: 'link1',
            object_type: 'link'
          }
        }
      ]
    }),
  },
]

```
