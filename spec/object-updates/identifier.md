# identifier

- **Update type name:** `identifier`
- **Update purpose:**
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    value: z.string().min(1),
    type: z.string().min(1),
    image: z.string().url().optional(),
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
            update_type: 'identifier',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
