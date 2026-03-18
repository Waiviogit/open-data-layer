# map_mobile_view

- **Update type name:** `map_mobile_view`
- **Update purpose:** Map mobile view (bounds, center, zoom).
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
  /** [lon, lat] — lon: -180..180, lat: -90..90 */
  top_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  bottom_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  center: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  zoom: z.number().int().min(1).max(18),
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
            update_type: 'map_mobile_view',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
