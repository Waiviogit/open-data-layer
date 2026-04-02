# Feed (posts, threads, comments, mentions, activity)

## route_path

- `/@:name`
- `/@:name/threads`
- `/@:name/comments`
- `/@:name/mentions`
- `/@:name/activity`

**Router:** `path: ['', '/(threads|comments|mentions|activity)']` → `PostsCommentsActivity` (`src/routes/configs/routes.js`).

## parent_route

[page-spec.md](../../page-spec.md) (`/@:name` shell).

## child_routes

None (leaf group).

## route_params

- `name`
- `0` — tab key: default treated as `posts` when empty path; otherwise `threads` | `comments` | `mentions` | `activity`.

## query_params

- `tags` — post list filter via `UserBlog` (`/?tags=...` comma-separated). Affects **data** for posts tab.

## layout

### persistent_regions

User shell header, sidebars (unless shell hides them for other reasons).

### dynamic_regions

Center: `PostsCommentsActivity` and tab content.

## route_region_impact

| region | impact |
|--------|--------|
| left-sidebar | Default visible (shell). |
| center | Tabs + feed components. |
| right-sidebar | Default visible when shell shows it. |

## navigation

Ant Design `Tabs` with `Link` per tab; pathname drives `activeKey` (`match.params['0']`).

## visible_blocks

| block | file path |
|-------|-----------|
| PostsCommentsActivity | `src/client/user/PostsCommentsActivity/PostsCommentsActivity.js` |
| UserBlog | `src/client/user/UserBlog/UserBlog.js` |
| Threads | `src/client/Threads/Threads.js` |
| UserProfilePosts / UserComments | `src/client/user/UserComments` (as used) |
| UserMentions | `src/client/components/UserMentions/UserMentions.js` |
| UserActivity | `src/client/activity/UserActivity.js` |
| EmptyMutedUserProfile | `src/client/statics/MutedContent` |

## actions

Feed actions from `feedStore` (`getUserProfileBlogPosts`, `getUserComments`, `getThreadsContent`, etc. per tab).

## state_model

- Route param `0` selects tab.
- Redux: feed, user, auth.
- `tags` query affects blog fetch.

## loading_behavior

Per tab component loaders; muted user short-circuits to empty state.

## conditional_visibility

- Guest users: `threads` tab omitted.
- Muted profile: `EmptyMutedUserProfile`.

## query_params (detailed)

| param | affects |
|-------|---------|
| `tags` | Blog posts request (UserBlog) |

## child_route_integration

N/A.

## apps/web (Next.js)

- Center content for these routes is `FeedProfileContent` → `FeedList` → `StoryContainer` / `Story`. See [story-container.md](../../../../components/story-container.md).
- Mock feed rows: `apps/web/src/app/user-profile/[name]/mock-feed.ts` (sample data for `@demo` only).

## References

- [../../page-spec.md](../../page-spec.md)
- [../../components/posts-comments-activity.md](../../components/posts-comments-activity.md)
- [../../modals/post-modal.md](../../modals/post-modal.md)
- [../../tabs/feed-posts-tabs.md](../../tabs/feed-posts-tabs.md)

```yaml
integration_contract:
  input_data: match.params.name, match.params.0, query tags, user mute state.
  emitted_actions: Feed fetch actions, post modal open from feed.
  controlled_by_state: Redux feed + user; tab from route.
  affected_by_route: Tab segment.
  affected_by_query: tags on posts tab.
```
