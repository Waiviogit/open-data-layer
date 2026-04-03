# Feed posts tabs

## tabs

Posts, Threads (non-guest), Comments, Mentions, Activity — [`PostsCommentsActivity`](../components/posts-comments-activity.md).

## active source

- **Route:** `match.params['0']` with default `posts` for base `/@:name`.

## switching

- Ant Design `Tabs` with `Link` in tab title; changing tab = route change.

## affected region

- **Center** only.

## Next.js posts tab

The **posts** tab loads the account blog from query-api: `POST /api/v1/users/:name/blog` with optional `limit` and opaque `cursor` pagination (see [user-blog-feed-endpoint.md](../../../../../query-api/spec/user-blog-feed-endpoint.md)).

## References

- [../routes/feed/page-spec.md](../routes/feed/page-spec.md)
- [../components/posts-comments-activity.md](../components/posts-comments-activity.md)

```yaml
integration_contract:
  input_data: Tab key from route.
  emitted_actions: Implicit child data fetch on tab.
  controlled_by_state: Route param 0.
  affected_by_route: '' | threads | comments | mentions | activity.
  affected_by_query: tags on posts via UserBlog (legacy); Next posts tab uses blog feed API body cursor.
```
