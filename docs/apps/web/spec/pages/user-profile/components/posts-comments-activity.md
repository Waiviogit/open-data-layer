# PostsCommentsActivity

## metadata

| field | value |
|-------|-------|
| name | PostsCommentsActivity |
| source | `src/client/user/PostsCommentsActivity/PostsCommentsActivity.js` |
| type | Connected + injectIntl |

## structure

- Ant Design `Tabs` with tab panes linking to `/@name`, `/threads`, `/comments`, `/mentions`, `/activity`.

## inputs

- `match`, `user`, `authenticatedUserName`, `intl`.

## state

- Tab from `match.params['0']`, default `posts`.

## actions

- Legacy: feed actions delegated to children (`getUserProfileBlogPosts`, etc.).
- **apps/web:** the **posts** tab uses `getUserBlogFeedPageQuery` / `loadMoreUserBlogFeedAction` against query-api (`POST /api/v1/users/:name/blog`). Other tabs still use `mock-feed` for demo data.

## rendering

- Muted guard → `EmptyMutedUserProfile`; else tab content.

## emitted events

- Feed fetches via children (legacy) or query-api blog feed (Next posts tab).

## References

- [../routes/feed/page-spec.md](../routes/feed/page-spec.md)
- [../tabs/feed-posts-tabs.md](../tabs/feed-posts-tabs.md)
- [../modals/post-modal.md](../modals/post-modal.md)

```yaml
integration_contract:
  input_data: match.params, user mute state.
  emitted_actions: Feed loads through children.
  controlled_by_state: Route tab key.
  affected_by_route: feed paths.
  affected_by_query: tags via UserBlog.
```
