# map

- **Update type name:** `map`
- **Update purpose:** GeoJSON Point (longitude, latitude).
- **Cardinality:** single
- **Payload kind:** geo
- **Payload validation requirements (Zod schema):**

```ts
z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90), // latitude
  ]),
})
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
