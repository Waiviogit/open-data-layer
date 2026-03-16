# cryptopairs

- **Object type name:** `cryptopairs`
- **Object purpose:**

- **supported_updates**

[`chart_id`](../object-updates/chart_id.md)
[`name`](../object-updates/name.md)
[`pin`](../object-updates/pin.md)
[`remove`](../object-updates/remove.md)
[`status`](../object-updates/status.md)
[`avatar`](../object-updates/avatar.md)
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
            object_id: 'cryptopairs1',
            object_type: 'cryptopairs'
          }
        }
      ]
    }),
  },
]

```
