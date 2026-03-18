# page

- **Object type name:** `page`
- **Object purpose:** Static page or content page.

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
[`page_content`](../object-updates/page_content.md)
[`website`](../object-updates/website.md)
[`description`](../object-updates/description.md)
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
            object_id: 'page1',
            object_type: 'page'
          }
        }
      ]
    }),
  },
]

```
