# gallery_item

- **Update type:** `gallery_item`
- **Update description:** Gallery item or media entry.
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "album": {
      "type": "string",
      "minLength": 1
    },
    "value": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "album",
    "value"
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
            update_type: 'gallery_item',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
