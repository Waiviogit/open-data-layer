# restaurant

- **Object type name:** `restaurant`
- **Object purpose:** Restaurant or dining venue.

- **supported_updates**

[`status`](../object-updates/status.md)
[`avatar`](../object-updates/avatar.md)
[`name`](../object-updates/name.md)
[`title`](../object-updates/title.md)
[`background`](../object-updates/background.md)
[`parent`](../object-updates/parent.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`list_item`](../object-updates/list_item.md)
[`button`](../object-updates/button.md)
[`news_filter`](../object-updates/news_filter.md)
[`sort_custom`](../object-updates/sort_custom.md)
[`rating`](../object-updates/rating.md)
[`price`](../object-updates/price.md)
[`description`](../object-updates/description.md)
[`work_time`](../object-updates/work_time.md)
[`address`](../object-updates/address.md)
[`map`](../object-updates/map.md)
[`website`](../object-updates/website.md)
[`phone`](../object-updates/phone.md)
[`email`](../object-updates/email.md)
[`link`](../object-updates/link.md)
[`blog`](../object-updates/blog.md)
[`form`](../object-updates/form.md)
[`identifier`](../object-updates/identifier.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`menu_item`](../object-updates/menu_item.md)
[`delegation`](../object-updates/delegation.md)
[`wallet_address`](../object-updates/wallet_address.md)
[`promotion`](../object-updates/promotion.md)

- **supposed_updates**

`rating`: "Ambience", "Service", "Food", "Value"
`tag_category`: "Cuisine", "Features", "Good For"

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
            object_id: 'restaurant1',
            object_type: 'restaurant'
          }
        }
      ]
    }),
  },
]

```
