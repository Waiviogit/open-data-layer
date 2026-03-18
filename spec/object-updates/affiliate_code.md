# affiliate_code

- **Update type name:** `affiliate_code`
- **Update description:** Affiliate or referral code list.
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z.array(z.string().min(1)).min(1)
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
            update_type: 'affiliate_code',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
