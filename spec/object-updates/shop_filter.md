# shop_filter

- **Update type:** `shop_filter`
- **Update description:** Shop catalog filter configuration.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "minLength": 1
    },
    "departments": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "authorities": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "type"
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
            update_type: 'shop_filter',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
