# Story container (feed row)

**Back:** [web overview](../overview.md) · **Related:** [architecture](../architecture.md), [theme](../theme.md)

## Purpose

`StoryContainer` and `Story` render a **single feed row** (post-like card) for profile feeds: posts, threads, comments, mentions, and activity. The legacy Redux-connected design is described in `tmp/story-container.md`; this app uses **server-provided props** only — no global feed store in the first slice.

## Code locations

| Piece | Path |
|-------|------|
| Module barrel | `apps/web/src/modules/feed/index.ts` |
| DTO (Zod) | `apps/web/src/modules/feed/application/dto/feed-story.dto.ts` |
| `FeedTab` | `apps/web/src/modules/feed/domain/feed-tab.ts` |
| `StoryContainer` | `apps/web/src/modules/feed/presentation/components/story-container.tsx` |
| `Story` | `apps/web/src/modules/feed/presentation/components/story.tsx` |
| `FeedList` | `apps/web/src/modules/feed/presentation/components/feed-list.tsx` |
| Route mocks | `apps/web/src/app/user-profile/[name]/mock-feed.ts` |
| Feed wiring | `apps/web/src/app/user-profile/[name]/feed-profile-content.tsx` |

## Data flow

1. Route `page.tsx` (Server Component) resolves `accountName` from params.
2. `getMockFeedItems(accountName, tab)` returns `FeedStoryView[]` (today: **demo account only**; see below).
3. `FeedProfileContent` renders `FeedList` or an empty state.
4. Each row: `StoryContainer` → `Story` with serialized props.

## `FeedStoryView` (DTO)

Validated with `feedStoryViewSchema`. Fields include: `id`, `authorName`, optional `authorDisplayName`, optional `authorAvatarUrl` (nullable; explicit URL from API when present), `createdAt` (ISO datetime string), optional `title`, `excerpt`, optional `isNsfw`, optional `permalinkPath`.

## Layout (v1)

- Header: [`UserAvatar`](avatar.md) (explicit `authorAvatarUrl` or Hive default by `authorName`), display name, `@author`, formatted timestamp.
- Body: optional linked title, excerpt; optional NSFW note (rules not fully implemented).
- Footer: disabled placeholders for like / reblog / bookmark (interactions to be wired later).

## Out of scope (v1)

Reblog banner, pin, DMCA/NSFW gating, inline thread editor, voting/bookmark/reblog server actions — track in future specs when API ports exist.

## Demo-only mocks

`getMockFeedItems` returns **non-empty** sample rows only when `accountName` matches **`demo`** (case-insensitive). Other accounts see the empty state with a short note. Tab-specific copy lives in `mock-feed.ts` (posts, threads, comments, mentions, activity).

## Verification

`pnpm nx lint web` · `pnpm nx build web`
