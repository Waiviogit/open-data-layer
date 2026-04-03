# User blog feed (read)

**Back:** [query-api README](../README.md)

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/users/:name/blog` | Paginated newest-first **blog** feed: root posts by the account plus posts they reblogged, merged by `feedAt` (original `created_unix` or `reblogged_at_unix`). |

Path parameter `name` is the Hive account name (3–32 chars, `[a-zA-Z0-9.-]`).

## Request body: `UserBlogFeedBody`

JSON object (Zod-validated):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number (int, 1–50) | `20` | Page size. |
| `cursor` | string \| omitted | — | Opaque cursor from the previous response. Omit for the first page. |

## Response: `UserBlogFeedResponse`

| Field | Type | Description |
|-------|------|-------------|
| `items` | `FeedStoryItem[]` | Page of feed rows. |
| `cursor` | string \| null | Next page cursor; `null` when there is no next page. |
| `hasMore` | boolean | Whether more pages exist (same as `cursor !== null` when the last page is non-empty). |

### `FeedStoryItem`

| Field | Type | Source / notes |
|-------|------|----------------|
| `id` | string | `author/permlink` |
| `author` | string | Post author (`posts.author`) |
| `permlink` | string | `posts.permlink` |
| `title` | string | `posts.title` |
| `excerpt` | string | HTML-stripped, truncated `posts.body` |
| `createdAt` | string (ISO 8601) | Original post time: `posts.created_unix` |
| `feedAt` | string (ISO 8601) | Row sort time: `created_unix` for own posts, `reblogged_at_unix` for reblog rows |
| `rebloggedBy` | string \| null | Reblogger account from `post_reblogged_users.account`, or `null` for own posts |
| `isNsfw` | boolean | From `json_metadata` tags / `category` |
| `category` | string \| null | `posts.category` |
| `children` | number | `posts.children` (comment count) |
| `pendingPayout` | string | `posts.pending_payout_value` |
| `totalPayout` | string | `posts.total_payout_value` |
| `netRshares` | string | `posts.net_rshares` (bigint as string) |
| `thumbnailUrl` | string \| null | First image: `json_metadata.image[0]`, else first markdown/HTML image in `posts.body` |
| `authorProfile` | object | From `accounts_current` via batch `findByNames` — `name`, `displayName`, `avatarUrl`, `reputation` (`object_reputation`) |
| `objects` | array | Resolved `post_objects` rows with `name` / `avatar` from object view resolution |
| `votes` | object | `totalCount`, `previewVoters` (top voters by `rshares`) from `post_active_votes` |

## Cursor format

Opaque **base64url** JSON: `{ feedAt: number, author: string, permlink: string }` where `feedAt` is Unix seconds (same composite keyset as the SQL merge). Invalid cursor with `cursor` present returns an empty `items` array and `hasMore: false`.

## Errors

| Status | When |
|--------|------|
| `404` | No row in `accounts_current` for `name`. |

## OpenAPI

Registered in `openapi/feed.openapi.ts`; Swagger UI: `/api/v1/docs` on the running server.

## See also

- SQL strategy: [posts data model](../../../../spec/data-model/posts.md) — pushdown `UNION ALL` + keyset pagination
- Implementation: `apps/query-api/src/domain/feed/get-user-blog-feed.endpoint.ts`
