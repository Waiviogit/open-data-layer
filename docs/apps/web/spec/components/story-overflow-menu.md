# Story overflow menu (⋯)

**Back:** [web overview](../overview.md)

## Purpose

Context menu on each feed **story card** (`Story`) opened from the footer **more** control. Supports two item sets: **own post** vs **other user’s post**, with **Edit post** navigating to `/editor?author=…&permlink=…` when the viewer is the author.

## Behavior

| Viewer | Menu | Actions |
|--------|------|---------|
| Logged out | “Other” set | Any item opens the **Sign in** modal (`LoginModalProvider` / `LoginDialog`). |
| Logged in, not author | “Other” set | Items are **disabled** (placeholders). |
| Logged in, author | “Own” set | **Edit post** is a link to the editor; other items disabled. |

The editor page loads **title** and **body** from query-api `GET /query/v1/users/:author/drafts?permlink=…` using the session access cookie as `Authorization: Bearer` (see `fetch-user-post-draft.server.ts`).

## Code

| Area | Location |
|------|----------|
| Menu UI | `apps/web/src/modules/feed/presentation/components/story-overflow-menu.tsx` |
| Story wiring | `apps/web/src/modules/feed/presentation/components/story.tsx` |
| Login modal | `apps/web/src/modules/auth/presentation/components/login-modal-provider.tsx` (wrapped in `(app)/layout.tsx`) |
| Draft fetch | `apps/web/src/modules/editor/infrastructure/fetch-user-post-draft.server.ts` |
| i18n keys | `feed_story_menu_*` in `apps/web/src/i18n/locales/*.json` |

## Data

`FeedStoryView` includes **`permlink`** (from the blog feed API mapper). **Current username** is resolved in `feed-profile-content` and passed through `FeedList` → `StoryContainer` → `Story`.
