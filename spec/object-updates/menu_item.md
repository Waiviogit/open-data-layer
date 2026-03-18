# menu_item

- **Update type:** `menu_item`
- **Update description:** Menu item or dish entry.
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
    "style": {
      "type": "string",
      "minLength": 1
    },
    "image": {
      "type": "string"
    },
    "link_to_object": {
      "type": "string"
    },
    "object_type": {
      "type": "string"
    },
    "link_to_web": {
      "type": "string",
      "format": "uri"
    }
  },
  "required": [
    "title",
    "style"
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
            update_type: 'menu_item',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
