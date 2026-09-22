---
id: docs-apps-query-api-spec-object-posts-feed
title: Object posts feed
description: POST /query/v1/objects/:objectId/posts — paginated posts for an object's Reviews tab (legacy getPostsByObject scope).
type: spec
status: active
scope: query-api
tags: [query-api, object-posts-feed]
updated_at: 2026-09-22
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/query-api/spec/object-threads-feed.md
---

# Object posts feed

`POST /query/v1/objects/:objectId/posts` — paginated posts for an object's Reviews tab.

## Purpose

Ports legacy Waivio `getPostsByObject` to the ODL Postgres schema. Returns the same `UserBlogFeedResponse` shape as `POST /query/v1/users/:name/blog`.

## Request

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | int 1–50 | 20 | Page size |
| `cursor` | string | — | Opaque keyset cursor (`feedAt`, `author`, `permlink`) |
| `currency` | enum | USD | Reward display currency |

Headers: `Accept-Language` / `X-Locale`, `X-Governance-Object-Id`, `X-Viewer` (same as user blog feed).

## Selection logic

Governance loads these update types for scope building: `newsFeed`, `pin`, `remove`, `group_id`, `walletAddress`, `link`, `website`, `url`.

1. **Regular objects** — posts matching **any** of (OR):
   - Linked via `post_objects` to the object, group siblings (`meta_group_id`), or relisted sources (`status` update `relisted` → this object).
   - `link` object type: `post_links.url` prefix-matches object `url` (LIKE with escaped `%`/`_`).
   - Business-like types (support `walletAddress`): social `link` channel URLs (`SOCIAL_LINK_BASE` map), `website` link prefixes, HIVE/HBD wallet `post_mentions`. A stored `http(s)` `link.value` is the prefix as-is; a profile name is prefixed with `SOCIAL_LINK_BASE`.
2. **`newsfeed` objects** — `newsFeed` update filter (`allow_list`, `ignore_list`, `type_list`, `authors`). Empty allow rule with no `type_list`/`authors` scopes to posts linked to the newsfeed object (legacy `author_permlink` default).
3. **Exclusions** — `pin` and `remove` update refs excluded from the main query via `(author, permlink)` tuple; pinned rows are re-fetched and prepended on page 1.
4. **Hashtag** — `post_languages` filter from request locale; see [post-languages.md](../../../spec/data-model/post-languages.md).
5. **Pinned** — valid `pin` updates prepended on the first page (no cursor), deduped from the feed page.

Root posts only, except news-feed `authors` filter (legacy `reblog_to` drop).

## Response flags

Each `FeedStoryItem` may include:

| Field | Meaning |
|-------|---------|
| `pin` | `true` when the post is pinned (object pin update or viewer-created pin) |
| `hasPinUpdate` | `true` when a valid object `pin` update lists this post |
| `hasRemoveUpdate` | `true` when a valid object `remove` update lists this post |

## HTTP status vs empty body

| Case | Status | Body |
|------|--------|------|
| Unknown / inactive object | 404 | — |
| Valid object, no matching posts | 200 | `{ items: [], cursor: null, hasMore: false }` |
| Invalid cursor | 200 | empty feed (same as above) |
| `newsfeed` object with no parseable `newsFeed` update | 200 | empty feed |

## Intentional divergences from legacy Waivio

Not ported (no ODL schema / tenant context):

- `blocked_for_apps` (per-app host block list)
- Per-user `hiddenPosts` list
- News `type_list` intersection with `app.supported_object_types` / `supported_objects`

Pagination uses keyset cursors instead of `skip`.

## Known follow-ups (web)

- `ObjectWriteReviewPrompt` has no composer wired.

## MCP

Tool: `get_object_posts` — mirrors HTTP with `object_id` + locale context params.

## Verification

```bash
pnpm nx test query-api --testPathPatterns="object-feed-scope|object-post-feed-scope|get-object-posts-feed"
pnpm nx test core --testPathPatterns=post-language
```
