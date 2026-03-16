# status

- **Update type name:** `status`
- **Update purpose:**
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    title: z.string().min(1),
    link: z.string().min(1),
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
            update_type: 'status',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
