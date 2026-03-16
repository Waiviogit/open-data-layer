# similar

- **Update type name:** `similar`
- **Update purpose:**
- **Cardinality:** multi
- **Payload kind:** text
- **Payload validation requirements (Zod schema):**

```ts
z.string().min(1)
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
            update_type: 'similar',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
