# widget

- **Object type name:** `widget`
- **Object purpose:**

- **supported_updates**

[`name`](../object-updates/name.md)
[`avatar`](../object-updates/avatar.md)
[`title`](../object-updates/title.md)
[`background`](../object-updates/background.md)
[`status`](../object-updates/status.md)
[`widget`](../object-updates/widget.md)
[`parent`](../object-updates/parent.md)
[`description`](../object-updates/description.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`website`](../object-updates/website.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`delegation`](../object-updates/delegation.md)
[`promotion`](../object-updates/promotion.md)

- **supposed_updates**

(none)

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
            object_id: 'widget1',
            object_type: 'widget'
          }
        }
      ]
    }),
  },
]

```
