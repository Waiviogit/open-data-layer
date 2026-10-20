---
id: web-components-story-container
title: Story container
description: "`StoryContainer` and `Story` render a **single feed row** (post-like card) for profile feeds: posts, threads, comments, and mentions. Activity uses `@/modules/user-activity` instead — see [activity.md](../pages/user-profile/routes/activity.md)."
type: spec
status: active
scope: web
tags: [web, components]
updated_at: 2026-06-10
related:
  - docs/apps/web/spec/overview.md
  - docs/apps/web/spec/architecture.md
---

# Story container (feed row)

**Back:** [web overview](../overview.md) · **Related:** [architecture](../architecture.md), [theme](../theme.md)

## Purpose

`StoryContainer` and `Story` render a **single feed row** (post-like card) for profile feeds: posts, threads, comments, and mentions. The **activity** tab is out of scope — it uses operation timeline cards in `@/modules/user-activity` ([activity.md](../pages/user-profile/routes/activity.md)).

## Code locations

| Piece | Path |
|-------|------|
| Module barrel | `apps/web/src/modules/feed/index.ts` |
| DTO (Zod) | `apps/web/src/modules/feed/application/dto/feed-story.dto.ts` |
| Blog feed page DTO | `apps/web/src/modules/feed/application/dto/user-blog-feed-page.dto.ts` |
| API → view mapper | `apps/web/src/modules/feed/application/mappers/feed-story-from-api.mapper.ts` |
| Blog feed query | `apps/web/src/modules/feed/application/queries/get-user-blog-feed.query.ts` |
| Blog feed client (server) | `apps/web/src/modules/feed/infrastructure/clients/blog-feed.client.ts` |
| `FeedTab` | `apps/web/src/modules/feed/domain/feed-tab.ts` |
| `StoryContainer` | `apps/web/src/modules/feed/presentation/components/story-container.tsx` |
| `Story` | `apps/web/src/modules/feed/presentation/components/story.tsx` |
| `FeedList` | `apps/web/src/modules/feed/presentation/components/feed-list.tsx` |
| Route mocks (non-posts tabs) | `apps/web/src/app/user-profile/[name]/mock-feed.ts` |
| Posts tab wiring | `apps/web/src/app/user-profile/[name]/feed-profile-content.tsx`, `blog-feed-posts-list.tsx`, `blog-feed.actions.ts` |

## Data flow

### Posts tab

1. Route `page.tsx` (Server Component) resolves `accountName` from params.
2. `FeedProfileContent` calls `getUserBlogFeedPageQuery(accountName)` → `POST` to query-api [`user-blog-feed-endpoint.md`](../../../query-api/spec/user-blog-feed-endpoint.md) via `blog-feed.client.ts`.
3. `BlogFeedPostsList` (client) renders `FeedList` and optional **Load more**; pagination uses the server action `loadMoreUserBlogFeedAction` with the opaque `cursor`.

### Other tabs (threads, comments, mentions)

1. Respective `getUser*FeedPageQuery` or mock (`getMockFeedItems` for demo-only stubs where still used).
2. `BlogFeedPostsList` renders `FeedList`.

**Activity** is not a Story row — see [activity.md](../pages/user-profile/routes/activity.md).

## `FeedStoryView` (DTO)

Validated with `feedStoryViewSchema`. Core fields: `id`, `authorName`, optional `authorDisplayName`, optional `authorAvatarUrl`, `createdAt` (ISO datetime), optional `feedAt` (feed row time — reblog or original), optional `title`, `excerpt`, optional `isNsfw`, optional `permalinkPath`.

**Blog feed extras:** `rebloggedBy`, `children`, `pendingPayout`, `totalPayout`, `netRshares`, `objects` (tagged ODL summaries), `votes` (`totalCount`, `previewVoters`).

**Tagged object chips:** The API returns objects already sorted and capped (avatar priority, then `objects_core.weight`, max **4** per post — see [user-blog-feed-endpoint.md](../../../query-api/spec/user-blog-feed-endpoint.md)). The `Story` component applies `FEED_STORY_TAGGED_OBJECT_MAX` (`story-utils.ts`, same numeric limit) so the UI never renders more than four chips.

## Layout (v1)

- Header: [`UserAvatar`](avatar.md); when `rebloggedBy` is set, a **reblog line** (“Reblogged by @account”); display name, `@author`, formatted timestamp (`feedAt` when present, else `createdAt`).
- Body: optional title, excerpt, and **preview media** when `thumbnailUrl` / `videoThumbnailUrl` / `videoEmbedUrl` is set:
  - **Poster-first (YouTube / Vimeo / 3Speak / DTube):** shows poster + play button; inline iframe only after click. Poster uses a plain `<img class="absolute inset-0 size-full object-cover">` (not `next/image`) inside an aspect box. Landscape YouTube uses `hqdefault` (object-cover crops 4:3 letterbox); Shorts use `oar2` (true 9:16).
  - **Native feed players (TikTok, Instagram, Facebook, X, LinkedIn):** no public poster without app tokens — mounts the native iframe immediately (same as the article view). Story overlay is off so the iframe receives clicks; no Close control.
  - **Frame:** landscape providers use `aspect-video`; YouTube Shorts, TikTok, and Facebook Reels use `.video-embed-portrait` / `.video-embed-facebook-reel`: `aspect-ratio: 9/16` and `width: min(100%, 22.5rem, calc(min(70vh, 32rem) * 9 / 16))`. Instagram, X, and LinkedIn use a widget box (max 540px). IG / FB / X / LinkedIn iframe height follows host `postMessage` so the card grows instead of scrolling inside. Instagram `/embed` has no hide-likes API — the wrapper clips the likes count + “Add a comment” rows (`INSTAGRAM_EMBED_LIKES_COMMENT_CHROME_PX`). Residual fill is `bg-bg` (theme), not a CSS border.
  - **Active iframe (poster-first providers):** same aspect box as the poster, with Close control; full-card overlay link is removed so the iframe receives clicks.
  - **TikTok poster (tiles / gallery):** no static CDN; client fetches `/api/video-preview/tiktok?id=` (BFF oEmbed) when a poster is needed. Instagram / Facebook / X / LinkedIn tiles stay empty + play glyph.
  - **Title navigation:** when inline video is playing, title renders as `<Link href={permalinkPath}>` (overlay link is off); otherwise a full-body overlay link opens the post modal.
  - **3Speak excerpt:** when `videoEmbedUrl` is a 3Speak embed, excerpt HTML uses `feedExcerptToSafeHtml(…, { stripThreeSpeakLinks: true, stripVideoLinks: true })` to drop Peakd prefix markdown (`[![](poster)](3speak) ▶ [Watch on 3Speak](…) ---`) and show `▶ Watch on 3Speak` + body text.
  - **Video excerpt:** when `videoEmbedUrl` is set, `stripVideoLinks: true` drops leftover YouTube / Vimeo / DTube / TikTok / Instagram / Facebook / X / LinkedIn share URLs (the card already shows the player). Trailing excerpt `…` is not kept as part of the URL.
  - **Object chips** (name + optional avatar; up to four) when `objects` is non-empty; optional NSFW line.
- Footer: **`StoryVoteButton`**, comment toggle (**`StoryStatButton`** — muted until expanded), **`StoryReblogButton`** (hidden on own posts), overflow menu; payout when present.
- Below footer when expanded: **`StoryCommentsSection`** (`layout="quick"` — no sort dropdown), then **`StoryCommentEditor`** when logged in. Sort UI is only on **`BlogPostScreen`** / post modal (`layout="full"`).

**Related:** feed excerpt pipeline — `apps/web/src/shared/infrastructure/feed-excerpt-html.ts`; 3Speak poster fetch — `useStoryPreviewMediaUrl` + `fetchThreeSpeakThumbnail`.

## Out of scope (later)

Pin, DMCA/NSFW gating beyond tagging, inline thread editor, voting/bookmark/reblog server actions — track when API ports exist.

## Demo-only mocks (non-posts tabs)

`getMockFeedItems` returns **non-empty** sample rows only when `accountName` matches **`demo`** (case-insensitive). Other accounts see the empty state. Tab-specific copy lives in `mock-feed.ts`.

## Verification

`pnpm nx lint web` · `pnpm nx build web`
