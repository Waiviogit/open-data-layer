# affiliate_url_template

- **Update type name:** `affiliate_url_template`
- **Update purpose:**
- **Cardinality:** single
- **Payload kind:** text
- **Payload validation requirements (Zod schema):**

```ts
z
    .string()
    .min(1)
    .refine((v) => v.includes('$product_id') && v.includes('$affiliate_code'), {
      message: 'Template must contain $product_id and $affiliate_code',
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
            update_type: 'affiliate_url_template',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
