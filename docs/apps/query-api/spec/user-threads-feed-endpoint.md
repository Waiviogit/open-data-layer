# User profile threads feed (read)

**Back:** [query-api README](../README.md)

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/query/v1/users/:name/threads` | Paginated **threads** feed for a profile (`byUser`): rows from `threads` where the profile is **mentioned** or is the **author** (excluding `bulk_message`), sorted by `created_unix`. |

Path parameter `name` is the Hive account name (3–32 chars, `[a-zA-Z0-9.-]`).

**404** when there is no `accounts_current` row for `name` (same as blog feed).

## Request headers (optional)

| Header | Role |
|--------|------|
| `Accept-Language` / `X-Locale` | Reserved for parity with other feed routes (no object resolution in this endpoint). |
| `X-Viewer` | Optional viewer account; `user_account_mutes` excludes threads whose `author` is muted by the viewer; `votes.voted` uses `thread_active_votes`. |

## Request body: `UserThreadsFeedBody`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number (int, 1–50) | `20` | Page size. |
| `cursor` | string \| omitted | — | Opaque cursor (same encoding as blog: `{ feedAt, author, permlink }`, `feedAt` = `created_unix`). |
| `sort` | `latest` \| `oldest` | `latest` | Sort direction for `created_unix` (and tie-breakers `author`, `permlink`). |

## Response

Same shape as [User blog feed](user-blog-feed-endpoint.md): `UserBlogFeedResponse` (`items`, `cursor`, `hasMore`).

Thread cards use:

- `title`: empty string
- `objects`: always `[]`
- `pendingPayout`, `totalPayout`, `netRshares`: empty strings (no reward line in UI)
- `rebloggedBy`: always `null`
- `category`: `threads.type` (`leothreads` \| `ecencythreads`)
- `votes`: from `thread_active_votes`

## Filter logic

- `deleted = false`
- `(LOWER(author) = LOWER(profile) AND bulk_message = false) OR profile appears in mentions (case-insensitive via unnest(mentions))`
- If `X-Viewer` is set: exclude rows where `author` is in that viewer’s muted list (`UserAccountMutesRepository.listMutedForMuters`).

## Code

- Controller: `apps/query-api/src/controllers/user-threads.controller.ts`
- Endpoint: `apps/query-api/src/domain/feed/get-user-threads-feed.endpoint.ts`
- Repository: `apps/query-api/src/repositories/threads.repository.ts`
