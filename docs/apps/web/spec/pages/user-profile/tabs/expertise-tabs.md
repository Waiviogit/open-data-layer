# Expertise tabs

## tabs

Hashtags, Objects — [`UserExpertise`](../components/user-expertise.md).

## active source

- **Route:** `expertise-hashtags` | `expertise-objects` in path.

## switching

- `Tabs` + `Link`.

## affected region

- **Center** list.

## References

- [../routes/expertise/page-spec.md](../routes/expertise/page-spec.md)
- [../components/user-expertise.md](../components/user-expertise.md)

```yaml
integration_contract:
  input_data: Route tab, name, locale.
  emitted_actions: ObjectDynamicList fetch.
  controlled_by_state: Route.
  affected_by_route: expertise-hashtags | expertise-objects.
  affected_by_query: none.
```
