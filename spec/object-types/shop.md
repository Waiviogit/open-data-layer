# shop

- **Object type name:** `shop`
- **Object purpose:** Shop or store with catalog and filters.

- **supported_updates**

[`shop_filter`](../object-updates/shop_filter.md)
[`parent`](../object-updates/parent.md)
[`name`](../object-updates/name.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`avatar`](../object-updates/avatar.md)
[`title`](../object-updates/title.md)
[`description`](../object-updates/description.md)
[`background`](../object-updates/background.md)
[`status`](../object-updates/status.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`website`](../object-updates/website.md)
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
            object_id: 'shop1',
            object_type: 'shop'
          }
        }
      ]
    }),
  },
]

```
