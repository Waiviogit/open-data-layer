# Single post endpoint

## Route

`GET /query/v1/posts/{author}/{permlink}`

Global prefix: `query`; version: URI `v1` (see [query-api README](../README.md)).

## Purpose

Returns one Hive post by primary key (`author`, `permlink`) for full-page display: **full `body`**, **all** tagged objects resolved with the same update types as the blog feed (`name`, `avatar` via `FEED_OBJECT_UPDATE_TYPES`), and the same **active vote summary** as feed cards (`totalCount`, `previewVoters`).

Unlike `POST /query/v1/users/{name}/blog`, this endpoint does **not** cap tagged objects to four chips; order matches the feed (avatar preference, then `objects_core.weight`, then `object_id`).

## Headers

| Header | Role |
|--------|------|
| `Accept-Language` / `X-Locale` | Locale for object view resolution (see `@ReqLocale`). |
| `X-Governance-Object-Id` | Optional governance merge for object views (same as blog feed). |

## Responses

| Code | When |
|------|------|
| 200 | JSON `SinglePostView`: feed-shaped fields plus `body`; `feedAt` equals `createdAt`; `rebloggedBy` is always `null` (no feed-branch context). |
| 404 | No row in `posts` for `{author, permlink}`. |

## URL collision (web)

Public URLs `/@author/{segment}` rewrite to `/user-profile/author/{segment}`. Static profile tabs (e.g. `threads`, `comments`) take precedence over a dynamic `[permlink]` segment; a post whose permlink equals a reserved tab id cannot use that public path.
