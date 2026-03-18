# sort_custom

- **Update type:** `sort_custom`
- **Update description:** Custom sort order or ranking.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "include": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "exclude": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "include",
    "exclude"
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
            update_type: 'sort_custom',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
