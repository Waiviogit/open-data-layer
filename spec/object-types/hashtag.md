# hashtag

- **Object type name:** `hashtag`
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
            object_id: 'hashtag1',
            object_type: 'hashtag'
          }
        }
      ]
    }),
  },
]

```
