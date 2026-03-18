# hashtag

- **Object type name:** `hashtag`
- **Object description:** Hashtag or topic tag for categorization.

- **supported_updates**

[`avatar`](../object-updates/avatar.md)
[`background`](../object-updates/background.md)
[`delegation`](../object-updates/delegation.md)
[`description`](../object-updates/description.md)
[`name`](../object-updates/name.md)
[`pin`](../object-updates/pin.md)
[`promotion`](../object-updates/promotion.md)
[`remove`](../object-updates/remove.md)
[`status`](../object-updates/status.md)
[`title`](../object-updates/title.md)

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
            object_id: 'hashtag1',
            object_type: 'hashtag'
          }
        }
      ]
    }),
  },
]

```
