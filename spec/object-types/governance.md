# governance

- **Object type name:** `governance`
- **Object description:** Governance snapshot: admins, trusted, moderation, object control (see spec).

- **supported_updates**

[`admins`](../object-updates/admins.md)
[`authorities`](../object-updates/authorities.md)
[`banned`](../object-updates/banned.md)
[`inherits_from`](../object-updates/inherits_from.md)
[`moderators`](../object-updates/moderators.md)
[`name`](../object-updates/name.md)
[`object_control`](../object-updates/object_control.md)
[`restricted`](../object-updates/restricted.md)
[`trusted`](../object-updates/trusted.md)
[`validity_cutoff`](../object-updates/validity_cutoff.md)
[`whitelist`](../object-updates/whitelist.md)

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
