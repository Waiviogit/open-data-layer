# Single post endpoint

## Route

`GET /query/v1/posts/{author}/{permlink}`

Global prefix: `query`; version: URI `v1` (see [query-api README](../README.md)).

## Purpose

Returns one Hive post by primary key (`author`, `permlink`) for full-page display: **full `body`**, **all** tagged objects resolved with the same update types as the blog feed (`name`, `avatar` via `FEED_OBJECT_UPDATE_TYPES`), and the same **active vote summary** as feed cards (`totalCount`, `previewVoters`, `voted` when `X-Viewer` is set).

Unlike `POST /query/v1/users/{name}/blog`, this endpoint does **not** cap tagged objects to four chips; order matches the feed (avatar preference, then `objects_core.weight`, then `object_id`).

## Headers

| Header | Role |
|--------|------|
| `Accept-Language` / `X-Locale` | Locale for object view resolution (see `@ReqLocale`). |
| `X-Governance-Object-Id` | Optional governance merge for object views (same as blog feed). |
| `X-Viewer` | Optional Hive account of the viewer; when set, linked objects include `hasAdministrativeAuthority` and richer fields (see `@ReqViewer`), and `votes.voted` is `true` if that account has a row in `post_active_votes` for this post. |

## Responses

| Code | When |
|------|------|
| 200 | JSON `SinglePostView`: feed-shaped fields plus `body`; `feedAt` equals `createdAt`; `rebloggedBy` is always `null` (no feed-branch context). |
| 404 | No row in `posts` for `{author, permlink}`. |

## URL collision (web)

Public URLs `/@author/{segment}` rewrite to `/user-profile/author/{segment}`. Static profile tabs (e.g. `threads`, `comments`) take precedence over a dynamic `[permlink]` segment; a post whose permlink equals a reserved tab id cannot use that public path.
