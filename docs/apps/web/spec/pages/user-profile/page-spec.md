**Back:** [Pages index](../index.md) · [web overview](../../overview.md)

# User profile shell (`/@:name`)

## Data loading

Shell profile (hero counts, display name, bio, avatars) is loaded in the App Router layout via query-api. See [data-loading.md](data-loading.md).

## route_path

`/@:name` with nested children under `pathScope` `/@:name` (see `src/routes/configs/routes.js` lines 402–411). Parent patterns also match optional tab and wallet segments for URL matching only.

## parent_route

`Wrapper` (`src/client/Wrapper.js`) — global layout and `renderRoutes`.

## child_routes

| normalized | path (relative to `/@:name`) | spec file |
|------------|------------------------------|-----------|
| feed | `''`, `/threads`, `/comments`, `/mentions`, `/activity` | [routes/feed/page-spec.md](routes/feed/page-spec.md) |
| social-graph | `/followers`, `/following`, `/following-objects` | [routes/social-graph/page-spec.md](routes/social-graph/page-spec.md) |
| user-shop | `/user-shop`, `/user-shop/:department` | [routes/user-shop/page-spec.md](routes/user-shop/page-spec.md) |
| favorites | `/favorites`, `/favorites/:objectType` | [routes/favorites/page-spec.md](routes/favorites/page-spec.md) |
| map | `/map` | [routes/map/page-spec.md](routes/map/page-spec.md) |
| recipe | `/recipe`, `/recipe/:department` | [routes/recipe/page-spec.md](routes/recipe/page-spec.md) |
| reblogs | `/reblogs` | [routes/reblogs/page-spec.md](routes/reblogs/page-spec.md) |
| transfers | `/transfers` | [routes/transfers/page-spec.md](routes/transfers/page-spec.md) |
| transfers-table | `/transfers/table` | [routes/transfers-table/page-spec.md](routes/transfers-table/page-spec.md) |
| transfers-waiv-table | `/transfers/waiv-table` | [routes/transfers-waiv-table/page-spec.md](routes/transfers-waiv-table/page-spec.md) |
| transfers-details | `/transfers/details`, `/transfers/details/:reportId` | [routes/transfers-details/page-spec.md](routes/transfers-details/page-spec.md) |
| expertise | `/expertise-hashtags`, `/expertise-objects` | [routes/expertise/page-spec.md](routes/expertise/page-spec.md) |
| about | `/about` | [routes/about/page-spec.md](routes/about/page-spec.md) |

## route_params

- `name` — Steem/Hive account name (URL segment).
- `0` — First path segment after `/@:name` when matched (tab key in several children); not always present for all URLs.

## query_params

Shell reads query for canonical URL (`useQuery` + `getQueryString` in `User.js`). Child-specific query documented in child specs.

## layout

### persistent_regions

- **Global (Wrapper):** header (`Topnav`), `TopNavigation`, global modals (see Wrapper).
- **User shell:** `UserHero` (header band: `UserHeader` + `UserMenu`) once user record is loaded; left and right columns when not in map/about/wallet-table mode.

### dynamic_regions

- **center:** Child route component via `renderRoutes(props.route.routes)` when `loaded`.
- **Sidebars:** Hidden per route flags (`isAboutPage`, `isMapPage`, `isOpenWalletTable`).

## route_region_impact

| region | behavior |
|--------|----------|
| left-sidebar | Hidden when `about`, `map`, or `isOpenWalletTable`. |
| center | `Loading` until `loaded`; then child route; class `display-table` when wallet table open. |
| right-sidebar | Hidden when `map` or `isOpenWalletTable`; keyed by `user.name` when shown. |

## navigation

Primary links from [components/user-menu.md](components/user-menu.md). Child routes change URL under `/@:name/...`.

## visible_blocks

| block | file path |
|-------|-----------|
| User | `src/client/user/User.js` |
| UserHero | `src/client/user/UserHero.js` |
| LeftSidebar | `src/client/app/Sidebar/LeftSidebar.js` |
| RightSidebar | `src/client/app/Sidebar/RightSidebar.js` |
| Child outlet | Nested `routes` in `src/routes/configs/routes.js` |

## actions

- `getUserAccount`, `getUserAccountHistory`, `getInfoForSideBar`, `getTokenBalance`, `resetBreadCrumb`, `setFavoriteObjectTypes`, `resetFavorites`, `resetUsers`, `openTransfer` (from connect map in `User.js`).

## state_model

- **Redux:** `user` slice for `name`, `loaded`, `failed`; `walletStore.isOpenWalletTable`; `favoritesStore` for types; `auth`, `app` for SEO.
- **Local:** None in `User` itself beyond hooks.

## loading_behavior

| region | behavior |
|--------|----------|
| header | `Loading` replaces `UserHero` while `user.fetching`. |
| left / right | Not mounted until `!isOpenWalletTable` and conditions; right requires `loaded`. |
| center | `renderRoutes` only when `loaded`. |

## conditional_visibility

- 404: `failed` or empty user without id when not fetching (`Error404` / `NotFound`).
- Guest: `GUEST_PREFIX` / `BXY_GUEST_PREFIX` affects copy and some children.
- `isOpenWalletTable`: full-width center, sidebars off.

## query_params (detailed)

- Any query preserved in canonical link via `getQueryString(query)` on `User` — document per-child where meaningful.

## child_route_integration

Children mount in the center region only; they inherit `match.params.name` and shared shell. See each [routes/*/page-spec.md](routes/).

## References

- [components/user.md](components/user.md)
- [components/user-hero.md](components/user-hero.md)
- [components/user-menu.md](components/user-menu.md)
- [components/left-sidebar.md](components/left-sidebar.md)
- [components/right-sidebar.md](components/right-sidebar.md)
- [tabs/global-user-menu.md](tabs/global-user-menu.md)
- [modals/transfer-and-wallet-modals.md](modals/transfer-and-wallet-modals.md)
- [modals/post-modal.md](modals/post-modal.md)
- [query-params-audit.md](query-params-audit.md)
- [variants/websites-routes.md](variants/websites-routes.md)
- Child route specs under [routes/](routes/)

```yaml
integration_contract:
  input_data: match.params, Redux user/wallet/favorites, authenticated user.
  emitted_actions: User fetch, favorites reset, transfer open, breadcrumb reset.
  controlled_by_state: loaded, failed, user.fetching, isOpenWalletTable, favoriteTypes.
  affected_by_route: All /@:name/* children.
  affected_by_query: Canonical SEO query string propagation.
```
