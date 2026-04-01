# UserFollowers

## metadata

| field | value |
|-------|-------|
| name | UserFollowers |
| source | `src/client/user/UserFollowers.js` |
| type | Connected + injectIntl |

## structure

- `Tabs` with three `Link` tabs: followers, following, following-objects.

## inputs

- `match`, `sort` (Redux), `user`, `authUser`, `handleChange`, `locale`.

## state

- Tab from `match.params['0']`.

## actions

- `changeSorting`; dynamic list fetchers for users/objects.

## rendering

- Conditional list per active tab.

## emitted events

- Sort change to auth store; pagination via dynamic list.

## References

- [../routes/social-graph/page-spec.md](../routes/social-graph/page-spec.md)
- [../tabs/followers-tabs.md](../tabs/followers-tabs.md)

```yaml
integration_contract:
  input_data: name, tab, sort preference, user counts.
  emitted_actions: changeSorting, list fetch.
  controlled_by_state: auth sort + route.
  affected_by_route: three social paths.
  affected_by_query: none.
```
