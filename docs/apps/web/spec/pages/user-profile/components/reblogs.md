# UserReblogs

## metadata

| field | value |
|-------|-------|
| name | UserReblogs |
| source | `src/client/user/UserReblogs.js` |
| type | Connected class |

## structure

- `Feed` with reblogs mode + `PostModal`.

## inputs

- `match`, `feed`, `authenticatedUser`.

## state

- Redux feed.

## actions

- `getFeedContent`, `getMoreFeedContent`, `showPostModal`.

## rendering

- Infinite feed of reblogs for user.

## emitted events

- Feed pagination; post modal.

## References

- [../routes/reblogs/page-spec.md](../routes/reblogs/page-spec.md)
- [../modals/post-modal.md](../modals/post-modal.md)

```yaml
integration_contract:
  input_data: name, feed state.
  emitted_actions: Load reblogs, open post modal.
  controlled_by_state: feed store.
  affected_by_route: reblogs.
  affected_by_query: none.
```
