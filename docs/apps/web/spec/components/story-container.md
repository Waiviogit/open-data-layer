# Story container (feed row)

**Back:** [web overview](../overview.md) · **Related:** [architecture](../architecture.md), [theme](../theme.md)

## Purpose

`StoryContainer` and `Story` render a **single feed row** (post-like card) for profile feeds: posts, threads, comments, mentions, and activity. The legacy Redux-connected design is described in `tmp/story-container.md`; this app uses **server-provided props** only — no global feed store in the first slice.

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

### Other tabs (threads, comments, mentions, activity)

1. `getMockFeedItems(accountName, tab)` returns `FeedStoryView[]` (**demo** account only; see below).
2. `FeedProfileContent` renders `FeedList` or an empty state.

Each row: `StoryContainer` → `Story` with serialized props.

## `FeedStoryView` (DTO)

Validated with `feedStoryViewSchema`. Core fields: `id`, `authorName`, optional `authorDisplayName`, optional `authorAvatarUrl`, `createdAt` (ISO datetime), optional `feedAt` (feed row time — reblog or original), optional `title`, `excerpt`, optional `isNsfw`, optional `permalinkPath`.

**Blog feed extras:** `rebloggedBy`, `children`, `pendingPayout`, `totalPayout`, `netRshares`, `objects` (tagged ODL summaries), `votes` (`totalCount`, `previewVoters`).

**Tagged object chips:** The API returns objects already sorted and capped (avatar priority, then `objects_core.weight`, max **4** per post — see [user-blog-feed-endpoint.md](../../../query-api/spec/user-blog-feed-endpoint.md)). The `Story` component applies `FEED_STORY_TAGGED_OBJECT_MAX` (`story-utils.ts`, same numeric limit) so the UI never renders more than four chips.

## Layout (v1)

- Header: [`UserAvatar`](avatar.md); when `rebloggedBy` is set, a **reblog line** (“Reblogged by @account”); display name, `@author`, formatted timestamp (`feedAt` when present, else `createdAt`).
- Body: optional linked title, excerpt; **object chips** (name + optional avatar; up to four) when `objects` is non-empty; optional NSFW line.
- Footer: comment count and **vote summary** (e.g. `@a, @b and N more liked this`) when data is present; disabled placeholders for like / reblog / bookmark (interactions to be wired later).

## Out of scope (later)

Pin, DMCA/NSFW gating beyond tagging, inline thread editor, voting/bookmark/reblog server actions — track when API ports exist.

## Demo-only mocks (non-posts tabs)

`getMockFeedItems` returns **non-empty** sample rows only when `accountName` matches **`demo`** (case-insensitive). Other accounts see the empty state. Tab-specific copy lives in `mock-feed.ts`.

## Verification

`pnpm nx lint web` · `pnpm nx build web`
