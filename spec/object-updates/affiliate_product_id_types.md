# affiliate_product_id_types

- **Update type name:** `affiliate_product_id_types`
- **Update description:** Supported product ID types for affiliate.
- **Cardinality:** single
- **Payload kind:** text
- **Payload validation requirements (Zod schema):**

```ts
z.string().toLowerCase()
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
            update_type: 'affiliate_product_id_types',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
