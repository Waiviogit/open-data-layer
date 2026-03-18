# news_feed

- **Update type name:** `news_feed`
- **Update description:** News feed configuration.
- **Cardinality:** single
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.object({
    allow_list: z.array(z.array(z.string())).optional(),
    ignore_list: z.array(z.string()).optional(),
    type_list: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
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
            update_type: 'news_feed',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
