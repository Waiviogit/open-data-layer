# group_min_expertise

- **Update type:** `group_min_expertise`
- **Update description:** Minimum expertise level for group.
- **Cardinality:** single
- **Payload kind:** text
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "pattern": "^\\d+$"
}
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
            update_type: 'group_min_expertise',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
