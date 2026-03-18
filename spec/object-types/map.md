# map

- **Object type name:** `map`
- **Object description:** Map view with objects and layers.

- **supported_updates**

[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`category_item`](../object-updates/category_item.md)
[`delegation`](../object-updates/delegation.md)
[`description`](../object-updates/description.md)
[`gallery_album`](../object-updates/gallery_album.md)
[`gallery_item`](../object-updates/gallery_item.md)
[`map_desktop_view`](../object-updates/map_desktop_view.md)
[`map_mobile_view`](../object-updates/map_mobile_view.md)
[`map_object_tags`](../object-updates/map_object_tags.md)
[`map_object_types`](../object-updates/map_object_types.md)
[`map_objects_list`](../object-updates/map_objects_list.md)
[`map_rectangles`](../object-updates/map_rectangles.md)
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
            object_id: 'map1',
            object_type: 'map'
          }
        }
      ]
    }),
  },
]

```
