# Favorites

## route_path

- `/@:name/favorites`
- `/@:name/favorites/:objectType`

**Router:** `path: '/(favorites)/:objectType?'` → `UserFavorites`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None (`objectType` optional).

## route_params

- `name`
- `objectType` — favorites category; defaults from Redux `getFavoriteObjectTypes` first entry.

## query_params

None.

## layout

### persistent_regions

User shell; sidebars on.

### dynamic_regions

Center: favorites grid + mobile sidenav trigger.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible. |
| center | Infinite scroll list of favorite objects. |
| right-sidebar | Visible. |

## navigation

[UserMenu](../../components/user-menu.md) when Waivio/social.

## visible_blocks

| block | file path |
|-------|-----------|
| UserFavorites | `src/client/components/Favorites/UserFavorites.js` |
| FavoritesMobileSidenav | `src/client/components/Favorites/FavoritesMobileSidenav/...` |
| ObjectCardSwitcher | `src/client/objectCard/ObjectCardSwitcher.js` |

## actions

`setFavoriteObjects`, `setMoreFavoriteObjects`, `setFavoriteObjectTypes` (from favorites store).

## state_model

- Redux: `favoriteObjects`, `objectTypes`, loading, hasMore.
- Local: `visible` for mobile sidenav.

## loading_behavior

`Loading` component while initial favorites load; infinite scroll after.

## conditional_visibility

Empty state when no favorites for type.

## child_route_integration

Shell sets favorite types on user change (`User.js` effect).

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/user-favorites.md](../../components/user-favorites.md)

```yaml
integration_contract:
  input_data: name, objectType param, favorite types from Redux.
  emitted_actions: setFavoriteObjects, load more.
  controlled_by_state: favoritesStore + local mobile drawer.
  affected_by_route: objectType segment.
  affected_by_query: none.
```
