# WebsiteBody (user map)

## metadata

| field | value |
|-------|-------|
| name | WebsiteBody |
| source | `src/client/websites/WebsiteLayoutComponents/Body/WebsiteBody.js` |
| type | Connected map page |

## structure

- Search/filter integration, `MainMap`, favorites coordination.

## inputs

- `location`, `query` (URLSearchParams), configuration selectors.

## state

- Map bounds, search string, show panel from query/store.

## actions

- `setFilterFromQuery`, map and website object actions.

## rendering

- Full-width map body; query-driven filters.

## emitted events

- History updates with query params (`permlink`, `center`, `searchString`, etc.).

## References

- [../routes/map/page-spec.md](../routes/map/page-spec.md)

```yaml
integration_contract:
  input_data: location.search, host config, favorites.
  emitted_actions: Map/search store updates, history push.
  controlled_by_state: searchStore, mapStore, query.
  affected_by_route: /@:name/map.
  affected_by_query: type, center, searchString, showPanel, tag filters.
```
