# dimensions

- **Update type:** `dimensions`
- **Update description:** Physical dimensions (length, width, depth, unit).
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "length": {
      "type": "number",
      "minimum": 0
    },
    "width": {
      "type": "number",
      "minimum": 0
    },
    "depth": {
      "type": "number",
      "minimum": 0
    },
    "unit": {
      "type": "string",
      "enum": [
        "km",
        "m",
        "cm",
        "mm",
        "μm",
        "mi",
        "yd",
        "ft",
        "in",
        "nmi"
      ]
    }
  },
  "required": [
    "length",
    "width",
    "depth",
    "unit"
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
            update_type: 'dimensions',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
