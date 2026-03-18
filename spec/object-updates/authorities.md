# authorities

- **Update type name:** `authorities`
- **Update purpose:** Governance: authority or scope list.
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
            update_type: 'authorities',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
