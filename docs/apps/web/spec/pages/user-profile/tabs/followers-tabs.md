# Followers tabs

## tabs

Followers, Following, Following objects — [`UserFollowers`](../components/user-followers.md).

## active source

- **Route:** `match.params['0']` ∈ { `followers`, `following`, `following-objects` }.

## switching

- `Tabs` + `Link` per route.

## affected region

- **Center** list area.

## References

- [../routes/social-graph/page-spec.md](../routes/social-graph/page-spec.md)
- [../components/user-followers.md](../components/user-followers.md)

```yaml
integration_contract:
  input_data: Tab from route, sort from Redux.
  emitted_actions: Dynamic list fetch, sort change.
  controlled_by_state: Route + auth sort.
  affected_by_route: three follower paths.
  affected_by_query: none.
```
