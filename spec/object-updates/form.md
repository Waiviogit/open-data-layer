# form

- **Update type:** `form`
- **Update description:** Form or input configuration.
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "column": {
      "type": "string",
      "minLength": 1
    },
    "form": {
      "type": "string",
      "minLength": 1
    },
    "link": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "title",
    "column",
    "form",
    "link"
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
            update_type: 'form',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
