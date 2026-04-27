# User profile comments feed (read, Hive)

**Back:** [query-api README](../README.md)

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/query/v1/users/:name/comments` | Paginated **comments** authored by the profile via Hive `condenser_api.get_discussions_by_comments`. No merge with ODL DB; guest comments are out of scope. |

Path parameter `name` is the Hive account name (3–32 chars, `[a-zA-Z0-9.-]`).

**404** when there is no `accounts_current` row for `name` (same as blog / threads).

## Request headers (optional)

| Header | Role |
|--------|------|
| `Accept-Language` / `X-Locale` | Parity with other feed routes. |
| `X-Viewer` | Optional viewer account; `votes.voted` uses `active_votes` from Hive for each item. |

## Request body: `UserThreadsFeedBody`

Same Zod schema as threads (`limit`, `cursor`, optional `sort`). **`sort` is ignored**; only `limit` and `cursor` apply.

## Response

Same shape as [User blog feed](user-blog-feed-endpoint.md): `UserBlogFeedResponse` (`items`, `cursor`, `hasMore`).

Items are mapped from Hive content: excerpts, thumbnails, payouts, `objects: []`, etc. Card **`title`** uses `title` when non-empty; otherwise **`root_title`** (root discussion title from Hive), so comments show context like PeakD. Replies under Leo Threads (`parent_author` / `url`) are **excluded**, matching legacy behaviour. The service **keeps calling** `get_discussions_by_comments` with the last raw comment permlink until the requested page is filled or Hive returns no more rows (same pattern as Waivio `getComments.js`). Each Hive request uses at most **20** comments per batch (`condenser_api` rejects a higher `limit`). For thread-indexed views, use the profile **Threads** feed.

## Cursor

Opaque base64url JSON: `{ feedAt, author, permlink }` (same encoding as blog/threads). `author` must match the profile; mismatch yields an empty page.
