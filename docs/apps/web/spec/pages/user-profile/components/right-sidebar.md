# RightSidebar

## metadata

| field | value |
|-------|-------|
| name | RightSidebar |
| source | `src/client/app/Sidebar/RightSidebar.js` |
| type | Shared shell widget |

## structure

- Right column with `key={user.name}` remount on user change.

## inputs

- `User.js` passes `key` when `loaded && !isMapPage`.

## state

- Selector-driven.

## actions

- Varies.

## rendering

- Hidden on **map** and **wallet table** mode.

## emitted events

- Context-specific.

## References

- [../page-spec.md](../page-spec.md)
- [user.md](user.md)

```yaml
integration_contract:
  input_data: Profile user name, loaded flag.
  emitted_actions: Varies.
  controlled_by_state: User shell visibility.
  affected_by_route: Most user routes except map/table.
  affected_by_query: none.
```
