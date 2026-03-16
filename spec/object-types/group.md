# group

- **Object type name:** `group`
- **Object purpose:**

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
[`tag_category`](../object-updates/tag_category.md)
[`category_item`](../object-updates/category_item.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`website`](../object-updates/website.md)
[`group_expertise`](../object-updates/group_expertise.md)
[`group_followers`](../object-updates/group_followers.md)
[`group_following`](../object-updates/group_following.md)
[`group_add`](../object-updates/group_add.md)
[`group_exclude`](../object-updates/group_exclude.md)
[`group_last_activity`](../object-updates/group_last_activity.md)
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
            object_id: 'group1',
            object_type: 'group'
          }
        }
      ]
    }),
  },
]

```
