# UserInfo (about)

## metadata

| field | value |
|-------|-------|
| name | UserInfo |
| source | `src/client/app/Sidebar/UserInfo/UserInfo.js` |
| type | Shared sidebar component reused on about route |

## structure

- Profile fields, links, metadata display.

## inputs

- User from Redux / props as implemented.

## state

- Local UI as needed.

## actions

- Navigate to edit profile (external to route).

## rendering

- About page content in center column.

## emitted events

- Navigation.

## References

- [../routes/about/page-spec.md](../routes/about/page-spec.md)

```yaml
integration_contract:
  input_data: User metadata from store.
  emitted_actions: Navigation to settings/edit.
  controlled_by_state: users store.
  affected_by_route: about.
  affected_by_query: none.
```
