# email

- **Update type name:** `email`
- **Update purpose:**
- **Cardinality:** single
- **Payload kind:** text
- **Payload validation requirements (Zod schema):**

```ts
z.string().email()
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
            update_type: 'email',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
