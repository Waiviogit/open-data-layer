# business

- **Object type name:** `business`
- **Object description:** Business or brand entity with location and contact.

- **supported_updates**

[`address`](../object-updates/address.md)
[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`blog`](../object-updates/blog.md)
[`button`](../object-updates/button.md)
[`category_item`](../object-updates/category_item.md)
[`delegation`](../object-updates/delegation.md)
[`description`](../object-updates/description.md)
[`email`](../object-updates/email.md)
[`featured`](../object-updates/featured.md)
[`form`](../object-updates/form.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`identifier`](../object-updates/identifier.md)
[`link`](../object-updates/link.md)
[`list_item`](../object-updates/list_item.md)
[`map`](../object-updates/map.md)
[`menu_item`](../object-updates/menu_item.md)
[`name`](../object-updates/name.md)
[`news_filter`](../object-updates/news_filter.md)
[`parent`](../object-updates/parent.md)
[`phone`](../object-updates/phone.md)
[`pin`](../object-updates/pin.md)
[`price`](../object-updates/price.md)
[`promotion`](../object-updates/promotion.md)
[`rating`](../object-updates/rating.md)
[`remove`](../object-updates/remove.md)
[`sort_custom`](../object-updates/sort_custom.md)
[`status`](../object-updates/status.md)
[`tag_category`](../object-updates/tag_category.md)
[`title`](../object-updates/title.md)
[`wallet_address`](../object-updates/wallet_address.md)
[`website`](../object-updates/website.md)
[`work_time`](../object-updates/work_time.md)

- **supposed_updates**

`rating`: "Overall"
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
            object_id: 'business1',
            object_type: 'business'
          }
        }
      ]
    }),
  },
]

```
