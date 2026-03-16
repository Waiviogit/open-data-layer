# app

- **Object type name:** `app`
- **Object purpose:**

- **supported_updates**

[`parent`](../object-updates/parent.md)
[`button`](../object-updates/button.md)
[`news_filter`](../object-updates/news_filter.md)
[`blog`](../object-updates/blog.md)
[`form`](../object-updates/form.md)
[`sort_custom`](../object-updates/sort_custom.md)
[`name`](../object-updates/name.md)
[`description`](../object-updates/description.md)
[`rating`](../object-updates/rating.md)
[`tag_category`](../object-updates/tag_category.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`price`](../object-updates/price.md)
[`work_time`](../object-updates/work_time.md)
[`address`](../object-updates/address.md)
[`map`](../object-updates/map.md)
[`website`](../object-updates/website.md)
[`phone`](../object-updates/phone.md)
[`email`](../object-updates/email.md)
[`link`](../object-updates/link.md)
[`avatar`](../object-updates/avatar.md)
[`title`](../object-updates/title.md)
[`background`](../object-updates/background.md)
[`status`](../object-updates/status.md)
[`list_item`](../object-updates/list_item.md)
[`category_item`](../object-updates/category_item.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`menu_item`](../object-updates/menu_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`delegation`](../object-updates/delegation.md)
[`wallet_address`](../object-updates/wallet_address.md)
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
            object_id: 'app1',
            object_type: 'app'
          }
        }
      ]
    }),
  },
]

```
