# Reblogs

## route_path

- `/@:name/reblogs`

**Router:** `path: '/reblogs'` → `UserReblogs` (`src/routes/components.js`).

## parent_route

[page-spec.md](../../page-spec.md).

## child_routes

None.

## route_params

- `name`

## query_params

None specific; feed modal uses app state for post preview.

## layout

Standard user shell with sidebars.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Visible. |
| center | Reblogs feed. |
| right-sidebar | Visible. |

## navigation

Not a primary `UserMenu` item in `UserMenu.js` (exists in `URL.USER.tabs` for router matching).

## visible_blocks

| block | file path |
|-------|-----------|
| UserReblogs | `src/client/user/UserReblogs.js` |
| Feed | `src/client/feed/Feed.js` |
| PostModal | `src/client/post/PostModalContainer.js` |

## actions

`getFeedContent`, `getMoreFeedContent`, `showPostModal`.

## state_model

Redux `feed` for reblogs stream.

## loading_behavior

Feed loading states from feed selectors.

## conditional_visibility

Empty states for own vs other user.

## child_route_integration

N/A.

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/reblogs.md](../../components/reblogs.md)
- [../../modals/post-modal.md](../../modals/post-modal.md)

```yaml
integration_contract:
  input_data: match.params.name, feed state.
  emitted_actions: load reblogs feed, open post modal.
  controlled_by_state: feed store.
  affected_by_route: reblogs path.
  affected_by_query: none.
```
