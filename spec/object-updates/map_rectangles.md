# map_rectangles

- **Update type:** `map_rectangles`
- **Update description:** Map rectangle or region overlays.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "top_point": {
        "type": "array",
        "prefixItems": [
          {
            "type": "number",
            "minimum": -180,
            "maximum": 180
          },
          {
            "type": "number",
            "minimum": -90,
            "maximum": 90
          }
        ]
      },
      "bottom_point": {
        "type": "array",
        "prefixItems": [
          {
            "type": "number",
            "minimum": -180,
            "maximum": 180
          },
          {
            "type": "number",
            "minimum": -90,
            "maximum": 90
          }
        ]
      }
    },
    "required": [
      "top_point",
      "bottom_point"
    ],
    "additionalProperties": false
  }
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
            update_type: 'map_rectangles',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
