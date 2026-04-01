# Post modal (preview)

## Trigger

- `showPostModal` from [`PostsCommentsActivity`](../components/posts-comments-activity.md) children ([`UserBlog`](../routes/feed/page-spec.md)), [`UserReblogs`](../components/reblogs.md), [`Feed`](../components/reblogs.md).

## parent_contexts

- [feed](../routes/feed/page-spec.md), [reblogs](../routes/reblogs/page-spec.md).

## states

- `appStore` or dedicated modal slice for visible post (see `showPostModal` in `src/store/appStore/appActions`).

## result

- User views post, closes modal; may navigate to full post.

## References

- [../components/posts-comments-activity.md](../components/posts-comments-activity.md)
- [../components/reblogs.md](../components/reblogs.md)
- [../routes/feed/page-spec.md](../routes/feed/page-spec.md)
- [../routes/reblogs/page-spec.md](../routes/reblogs/page-spec.md)

```yaml
integration_contract:
  input_data: Post id/permlink from feed row.
  emitted_actions: showPostModal, dismiss.
  controlled_by_state: app/modal state.
  affected_by_route: feed and reblogs when feed mounted.
  affected_by_query: none.
```
