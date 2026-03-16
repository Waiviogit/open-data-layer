# gallery_item

- **Update type name:** `gallery_item`
- **Update purpose:**
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    album: z.string().min(1),
    value: z.string().min(1),
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
            update_type: 'gallery_item',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
