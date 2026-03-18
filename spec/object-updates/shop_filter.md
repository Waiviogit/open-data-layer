# shop_filter

- **Update type name:** `shop_filter`
- **Update purpose:** Shop catalog filter configuration.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    type: z.string().min(1),
    departments: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    authorities: z.array(z.string()).optional(),
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
            update_type: 'shop_filter',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
