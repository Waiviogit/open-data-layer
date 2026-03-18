# work_time

- **Update type:** `work_time`
- **Update description:** Opening hours or work schedule.
- **Cardinality:** single
- **Payload kind:** text
- **Payload validation requirements (JSON Schema derived from Zod):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "minLength": 1
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
            update_type: 'work_time',
            locale: 'en-US',
            value_text: "<string>"
          }
        }
      ]
    }),
  },
]
```
