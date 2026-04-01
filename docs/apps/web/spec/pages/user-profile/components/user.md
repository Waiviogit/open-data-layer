# User (profile shell)

## metadata

| field | value |
|-------|-------|
| name | User |
| source | `src/client/user/User.js` |
| type | Connected route container |

## structure

- `main-panel` → Helmet SEO → NotFound | fragment with `ScrollToTopOnMount`, loading or `UserHero`, `feed-layout` with optional sidebars and `renderRoutes` outlet.

## inputs

- `route` (nested routes config)
- `match`, Redux: `user`, `loaded`, `failed`, `authenticated`, `isOpenWalletTable`, etc.

## state

- Redux-connected; local: none.
- `useParams`: `name`, `0` (tab).
- `useQuery` for canonical.

## actions

- `getUserAccount`, `getUserAccountHistory`, `getInfoForSideBar`, `getTokenBalance`, `resetBreadCrumb`, `setFavoriteObjectTypes`, `resetFavorites`, `resetUsers`, `openTransfer`.

## rendering

- Error404 on `failed`.
- Loading in hero slot while `user.fetching`.
- Sidebars suppressed for about/map/wallet-table modes.

## emitted events

- Indirect: Redux dispatches, `openTransfer` on hero transfer click.

## References

- [../page-spec.md](../page-spec.md)
- [user-hero.md](user-hero.md)
- [../modals/transfer-and-wallet-modals.md](../modals/transfer-and-wallet-modals.md)

```yaml
integration_contract:
  input_data: Route match, auth, user slice, wallet table flag.
  emitted_actions: User lifecycle fetches, transfer modal open.
  controlled_by_state: loaded, failed, user.fetching, isOpenWalletTable.
  affected_by_route: All /@:name/* children.
  affected_by_query: Canonical query string.
```
