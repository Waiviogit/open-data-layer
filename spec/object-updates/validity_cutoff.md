# validity_cutoff

- **Update type:** `validity_cutoff`
- **Update description:** Governance: validity or time cutoff for updates.
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "account": {
      "type": "string",
      "minLength": 1
    },
    "timestamp": {
      "type": "number"
    }
  },
  "required": [
    "account",
    "timestamp"
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
            update_type: 'validity_cutoff',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
