# governance

- **Object type name:** `governance`
- **Object purpose:**

- **supported_updates**

[`name`](../object-updates/name.md)
[`admins`](../object-updates/admins.md)
[`trusted`](../object-updates/trusted.md)
[`moderators`](../object-updates/moderators.md)
[`authorities`](../object-updates/authorities.md)
[`restricted`](../object-updates/restricted.md)
[`banned`](../object-updates/banned.md)
[`whitelist`](../object-updates/whitelist.md)
[`object_control`](../object-updates/object_control.md)
[`inherits_from`](../object-updates/inherits_from.md)
[`validity_cutoff`](../object-updates/validity_cutoff.md)

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
            object_id: 'governance1',
            object_type: 'governance'
          }
        }
      ]
    }),
  },
]

```
