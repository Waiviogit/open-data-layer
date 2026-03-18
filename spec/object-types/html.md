# html

- **Object type name:** `html`
- **Object purpose:** Standalone HTML content block.

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
[`promotion`](../object-updates/promotion.md)
[`parent`](../object-updates/parent.md)
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`website`](../object-updates/website.md)
[`html_content`](../object-updates/html_content.md)
[`content_position`](../object-updates/content_position.md)
[`content_view`](../object-updates/content_view.md)

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
            object_id: 'html1',
            object_type: 'html'
          }
        }
      ]
    }),
  },
]

```
