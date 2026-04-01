# UserHero

## metadata

| field | value |
|-------|-------|
| name | UserHero |
| source | `src/client/user/UserHero.js` |
| type | Presentational + UserMenuWrapper |

## structure

- `UserHeader` + `UserMenu` via `UserMenuWrapper` (`withRouter`).

## inputs

- `user`, `username`, `isSameUser`, `coverImage`, `hasCover`, `isGuest`, `onTransferClick`, `rewardFund`, `rate` (from User).

## state

- `UserMenuWrapper`: `onChange` uses `history.push` with `match.url`.

## actions

- `onChange(key)` → navigates to `/@:name` or `/@:name/:key` (discussions → empty segment).

## rendering

- Renders header and horizontal menu below cover.

## emitted events

- Navigation only (history.push).

## References

- [../page-spec.md](../page-spec.md)
- [user-header.md](user-header.md)
- [user-menu.md](user-menu.md)
- [../tabs/global-user-menu.md](../tabs/global-user-menu.md)

```yaml
integration_contract:
  input_data: User object, match.url, location, history.
  emitted_actions: Route changes under /@:name.
  controlled_by_state: Router.
  affected_by_route: First segment after name.
  affected_by_query: none.
```
