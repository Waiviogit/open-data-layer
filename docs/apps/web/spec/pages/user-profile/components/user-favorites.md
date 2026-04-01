# UserFavorites

## metadata

| field | value |
|-------|-------|
| name | UserFavorites |
| source | `src/client/components/Favorites/UserFavorites.js` |
| type | Functional + hooks |

## structure

- Helmet meta → loading | mobile sidenav row → empty | infinite scroll feed.

## inputs

- `useParams`: `name`, `objectType` (defaults from Redux types).

## state

- Local `visible` for mobile sidenav; Redux favorites slices.

## actions

- `setFavoriteObjects`, `setMoreFavoriteObjects`.

## rendering

- `ObjectCardSwitcher` list.

## emitted events

- Load more on scroll.

## References

- [../routes/favorites/page-spec.md](../routes/favorites/page-spec.md)

```yaml
integration_contract:
  input_data: name, objectType, favorite types list.
  emitted_actions: Fetch favorites, load more.
  controlled_by_state: favoritesStore + route param.
  affected_by_route: favorites/:objectType?
  affected_by_query: none.
```
