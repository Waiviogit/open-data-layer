# LeftSidebar

## metadata

| field | value |
|-------|-------|
| name | LeftSidebar |
| source | `src/client/app/Sidebar/LeftSidebar.js` |
| type | Shared shell widget |

## structure

- Sidebar content for current context (not only user).

## inputs

- Implicit from Redux/router context.

## state

- Selector-driven.

## actions

- Varies by embedded widgets.

## rendering

- Hidden on user **about** and **map** and when **wallet table** open (`User.js`).

## emitted events

- Context-specific.

## References

- [../page-spec.md](../page-spec.md)
- [user.md](user.md)

```yaml
integration_contract:
  input_data: Global app state, user name from route.
  emitted_actions: Varies.
  controlled_by_state: Shell visibility flags from User.
  affected_by_route: User profile routes except about/map/table.
  affected_by_query: none.
```
