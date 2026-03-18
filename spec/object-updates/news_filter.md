# news_filter

- **Update type:** `news_filter`
- **Update description:** News feed filter configuration.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "allow_list": {
      "type": "array",
      "items": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "ignore_list": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "type_list": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "allow_list",
    "ignore_list",
    "type_list"
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
            update_type: 'news_filter',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
