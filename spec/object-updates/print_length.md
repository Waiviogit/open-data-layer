# print_length

- **Update type name:** `print_length`
- **Update description:** Print or page length.
- **Cardinality:** single
- **Payload kind:** text
- **Payload validation requirements (Zod schema):**

```ts
z.string().regex(/^\d+$/, 'Must be a numeric string')
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
            update_type: 'print_length',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
