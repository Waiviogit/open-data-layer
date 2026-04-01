# UserExpertise

## metadata

| field | value |
|-------|-------|
| name | UserExpertise |
| source | `src/client/user/UserExpertise.js` |
| type | Functional |

## structure

- Two tab panes with `Link` to hashtags vs objects; `ObjectDynamicList` per mode.

## inputs

- `name`, `0` tab from `useParams`; `history.location.pathname` for hashtag detection.

## state

- Counters from `getExpCounters`.

## actions

- `getUrerExpertiseCounters`, `getObjectsList` via fetcher.

## rendering

- Tabs with counts in labels.

## emitted events

- Infinite list loads.

## References

- [../routes/expertise/page-spec.md](../routes/expertise/page-spec.md)
- [../tabs/expertise-tabs.md](../tabs/expertise-tabs.md)

```yaml
integration_contract:
  input_data: name, tab param, locale.
  emitted_actions: Expertise fetches.
  controlled_by_state: user expertise counters + route.
  affected_by_route: expertise-hashtags | expertise-objects.
  affected_by_query: none.
```
