# Map (favorites map)

## route_path

- `/@:name/map`

**Router:** `path: '/map'` → `WebsiteBody`.

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`

## query_params

**WebsiteBody** uses `location.search` heavily: `type`, tag filters via `parseTagsFilters`, `center`, `permlink`, `searchString`, `showPanel`, etc. Affects **data** and **layout** (map panel, search).

## layout

### persistent_regions

User `UserHero` (shell still renders).

### dynamic_regions

Center: full map UI. **Left and right sidebars hidden** in `User.js` when `tab === 'map'`.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | **Hidden** (`isMapPage`). |
| center | `WebsiteBody` + `MainMap`. |
| right-sidebar | **Hidden**. |

## navigation

[UserMenu](../../components/user-menu.md) link `/@:name/map` (Waivio/social gated).

## visible_blocks

| block | file path |
|-------|-----------|
| WebsiteBody | `src/client/websites/WebsiteLayoutComponents/Body/WebsiteBody.js` |
| MainMap | `src/client/websites/MainMap/MainMap.js` |

## actions

Search store, website store, map store (`setBoundsParams`, `setMapData`, favorites actions for map context).

## state_model

- URL query object (`URLSearchParams`) synced with filters and map center.
- Favorites / object coordinates from stores.

## loading_behavior

Map loading via `getMapLoading` selector; search results panel.

## conditional_visibility

Depends on `hasFavorites` / site config in parent (`User.js` layout classes).

## child_route_integration

`resetFavorites` / `setFavoriteObjectTypes` from shell lifecycle interacts with map data.

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/website-body-map.md](../../components/website-body-map.md)

```yaml
integration_contract:
  input_data: name, location.search query bundle, site configuration.
  emitted_actions: search/map store updates, history push with query.
  controlled_by_state: searchStore, mapStore, websiteStore.
  affected_by_route: map segment only.
  affected_by_query: type, center, searchString, showPanel, tag filters.
```
