# manufacturer

- **Update type name:** `manufacturer`
- **Update description:** Manufacturer or maker details.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    name: z.string().min(1),
    author_permlink: z.string().optional(),
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
            update_type: 'manufacturer',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
