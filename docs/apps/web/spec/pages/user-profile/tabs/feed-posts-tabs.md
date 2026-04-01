# Feed posts tabs

## tabs

Posts, Threads (non-guest), Comments, Mentions, Activity — [`PostsCommentsActivity`](../components/posts-comments-activity.md).

## active source

- **Route:** `match.params['0']` with default `posts` for base `/@:name`.

## switching

- Ant Design `Tabs` with `Link` in tab title; changing tab = route change.

## affected region

- **Center** only.

## References

- [../routes/feed/page-spec.md](../routes/feed/page-spec.md)
- [../components/posts-comments-activity.md](../components/posts-comments-activity.md)

```yaml
integration_contract:
  input_data: Tab key from route.
  emitted_actions: Implicit child data fetch on tab.
  controlled_by_state: Route param 0.
  affected_by_route: '' | threads | comments | mentions | activity.
  affected_by_query: tags on posts via UserBlog.
```
