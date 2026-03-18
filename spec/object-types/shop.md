# shop

- **Object type name:** `shop`
- **Object description:** Shop or store with catalog and filters.

- **supported_updates**

[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`delegation`](../object-updates/delegation.md)
[`description`](../object-updates/description.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`name`](../object-updates/name.md)
[`parent`](../object-updates/parent.md)
[`pin`](../object-updates/pin.md)
[`promotion`](../object-updates/promotion.md)
[`remove`](../object-updates/remove.md)
[`shop_filter`](../object-updates/shop_filter.md)
[`status`](../object-updates/status.md)
[`title`](../object-updates/title.md)
[`website`](../object-updates/website.md)

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
