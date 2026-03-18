# menu_item

- **Update type name:** `menu_item`
- **Update purpose:** Menu item or dish entry.
- **Cardinality:** multi
- **Payload kind:** json
- **Payload validation requirements (Zod schema):**

```ts
z
    .object({
      title: z.string().min(1),
      style: z.string().min(1),
      image: z.string().optional(),
      link_to_object: z.string().optional(),
      object_type: z.string().optional(),
      link_to_web: z.string().url().optional(),
    })
    .refine((v) => v.link_to_object !== undefined || v.link_to_web !== undefined, {
      message: 'Either link_to_object or link_to_web is required',
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
            update_type: 'menu_item',
            locale: 'en-US',
            value_json: {}  // or [] — valid JSON per schema
          }
        }
      ]
    }),
  },
]
```
