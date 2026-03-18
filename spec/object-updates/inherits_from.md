# inherits_from

- **Update type:** `inherits_from`
- **Update description:** Governance: merge fields from referenced governance object.
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "object_id": {
      "type": "string",
      "minLength": 1
    },
    "scope": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "admins",
          "trusted",
          "moderators",
          "validity_cutoff",
          "restricted",
          "whitelist",
          "authorities",
          "banned",
          "muted"
        ]
      }
    }
  },
  "required": [
    "object_id",
    "scope"
  ],
  "additionalProperties": false
}
```

- **Example payload for broadcast:**

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
          action: 'object_update',
          v: 1,
          payload: {
            object_id,
            update_type: 'inherits_from',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
