---
id: docs-apps-query-api-spec-single-post-endpoint
title: Single post endpoint
description: `GET /query/v1/posts/{author}/{permlink}`
type: spec
status: active
scope: query-api
tags: [query-api, single-post-endpoint]
updated_at: 2026-06-10
related:
  - docs/apps/query-api/spec/overview.md
  - docs/README.md
---

# Single post endpoint

## Route

`GET /query/v1/posts/{author}/{permlink}`

Global prefix: `query`; version: URI `v1` (see [query-api overview](overview.md)).

## Purpose

Returns one Hive post by primary key (`author`, `permlink`) for full-page display: **full `body`**, **all** tagged objects resolved with `POST_LINKED_OBJECT_UPDATE_TYPES` (includes `identifier`), optional [affiliate links](affiliate-links.md) via `?country=` / GeoIP, and the same **active vote summary** as feed cards (`totalCount`, `previewVoters`, `voted` when `X-Viewer` is set).

Unlike `POST /query/v1/users/{name}/blog`, this endpoint does **not** cap tagged objects to four chips; order matches the feed (avatar preference, then `objects_core.weight`, then `object_id`).

## Headers

| Header | Role |
|--------|------|
| `Accept-Language` / `X-Locale` | Locale for object view resolution (see `@ReqLocale`). |
| `X-Governance-Object-Id` | Optional governance merge for object views (same as blog feed). |
| `X-Viewer` | Optional Hive account of the viewer; when set, linked objects include `isFavorited` and richer fields (see `@ReqViewer`), and `votes.voted` is `true` if that account has a row in `post_active_votes` for this post. |

## Responses

| Code | When |
|------|------|
| 200 | JSON `SinglePostView`: feed-shaped fields plus `body`; `feedAt` equals `createdAt`; `rebloggedBy` is always `null` (no feed-branch context). |
| 404 | No row in `posts` for `{author, permlink}`. |

## URL collision (web)

Public URLs `/@author/{segment}` rewrite to `/user-profile/author/{segment}`. Static profile tabs (e.g. `threads`, `comments`) take precedence over a dynamic `[permlink]` segment; a post whose permlink equals a reserved tab id cannot use that public path.
