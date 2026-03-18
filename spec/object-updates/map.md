# map

- **Update type:** `map`
- **Update description:** GeoJSON Point (longitude, latitude).
- **Cardinality:** single
- **Payload kind:** geo
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "const": "Point"
    },
    "coordinates": {
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
    "type",
    "coordinates"
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
            update_type: 'map',
            locale: 'en-US',
            value_geo: { "type": "Point", "coordinates": [lon, lat] }
          }
        }
      ]
    }),
  },
]
```
