# map_rectangles

- **Update type name:** `map_rectangles`
- **Update purpose:**
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.array(
    z.object({
      /** [lon, lat] */
      top_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
      bottom_point: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    }),
  )
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
