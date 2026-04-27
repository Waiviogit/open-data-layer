# User profile mentions feed (read)

**Back:** [query-api README](../README.md)

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/query/v1/users/:name/mentions` | Paginated posts that **mention** the profile (`post_mentions.account` matches `:name`, case-insensitive). Posts **authored by** that same account are excluded (including self-mentions). |

Path parameter `name` is the Hive account name (3–32 chars, `[a-zA-Z0-9.-]`).

**404** when there is no `accounts_current` row for `name` (same as blog / threads).

## Request headers (optional)

| Header | Role |
|--------|------|
| `Accept-Language` / `X-Locale` | Same as blog feed; object chips use `locale`. |
| `X-Governance-Object-Id` | Governance context for projected objects. |
| `X-Viewer` | Optional viewer account. Posts whose **author** is in this viewer’s mute list (`user_account_mutes`) are excluded. `votes.voted` uses `post_active_votes`. |

## Request body: `UserBlogFeedBody`

Same as blog: `limit` (default 20), optional `cursor`. No `sort` field.

## Response

Same shape as [User blog feed](user-blog-feed-endpoint.md): `UserBlogFeedResponse` (`items`, `cursor`, `hasMore`).

Items include tagged **objects** and vote summaries like the blog feed. `rebloggedBy` is always `null` (mentions are not reblog rows). `feedAt` matches the post’s `created_unix`.

## Data source

- Join `post_mentions` → `posts` on `(author, permlink)`.
- Filter: `LOWER(posts.author) <> LOWER(:name)` so the profile owner’s own posts never appear.
- Sort: `posts.created_unix` descending, then `author`, `permlink` descending (same tie-break as blog own-post branch).
- Includes root posts and comments by **other** authors that mention the profile.

## Cursor

Opaque base64url JSON: `{ feedAt, author, permlink }` with `feedAt` = post `created_unix`. Next page uses strict lexicographic “older than” `(created_unix, author, permlink)` relative to the cursor tuple.
