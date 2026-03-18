# product_weight

- **Update type:** `product_weight`
- **Update description:** Product weight with unit.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "value": {
      "type": "number",
      "minimum": 0
    },
    "unit": {
      "type": "string",
      "enum": [
        "t",
        "kg",
        "gm",
        "mg",
        "mcg",
        "st",
        "lb",
        "oz"
      ]
    }
  },
  "required": [
    "value",
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
            update_type: 'product_weight',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
