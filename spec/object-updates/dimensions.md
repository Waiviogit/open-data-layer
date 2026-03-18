# dimensions

- **Update type name:** `dimensions`
- **Update description:** Physical dimensions (length, width, depth, unit).
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    depth: z.number().min(0),
    unit: z.enum(DIMENSION_UNITS),
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
