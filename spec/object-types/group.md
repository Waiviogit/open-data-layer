# group

- **Object type name:** `group`
- **Object description:** Group or community with membership and expertise.

- **supported_updates**

[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`category_item`](../object-updates/category_item.md)
[`delegation`](../object-updates/delegation.md)
[`description`](../object-updates/description.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`group_add`](../object-updates/group_add.md)
[`group_exclude`](../object-updates/group_exclude.md)
[`group_expertise`](../object-updates/group_expertise.md)
[`group_followers`](../object-updates/group_followers.md)
[`group_following`](../object-updates/group_following.md)
[`group_last_activity`](../object-updates/group_last_activity.md)
[`name`](../object-updates/name.md)
[`pin`](../object-updates/pin.md)
[`promotion`](../object-updates/promotion.md)
[`remove`](../object-updates/remove.md)
[`status`](../object-updates/status.md)
[`tag_category`](../object-updates/tag_category.md)
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
            object_id: 'group1',
            object_type: 'group'
          }
        }
      ]
    }),
  },
]

```
