# crypto

- **Object type name:** `crypto`
- **Object purpose:**

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
[`description`](../object-updates/description.md)
[`website`](../object-updates/website.md)
[`link`](../object-updates/link.md)
[`chart_id`](../object-updates/chart_id.md)
[`blog`](../object-updates/blog.md)
[`form`](../object-updates/form.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`menu_item`](../object-updates/menu_item.md)
[`delegation`](../object-updates/delegation.md)
[`promotion`](../object-updates/promotion.md)

- **supposed_updates**

`tag_category`: "Category", "Platform", "Consensus"

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
            object_id: 'crypto1',
            object_type: 'crypto'
          }
        }
      ]
    }),
  },
]

```
