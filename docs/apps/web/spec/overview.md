# web (Next.js)

**Back:** [Documentation index](../../../README.md) · **Related:** [Architecture](../../../architecture/overview.md), [Getting started](../../../getting-started.md)

## Purpose

The **web** application is the Next.js **App Router** frontend for the Open Data Layer monorepo.

## Scope and stack

| Item | Detail |
|------|--------|
| Framework | Next.js (App Router), React |
| App root | `apps/web/` |
| Entry layout | `apps/web/src/app/layout.tsx` |
| Server actions / cookies | Theme, shell mode, and locale use `'use server'` modules (e.g. `theme/actions.ts`, `shell-mode/actions.ts`, `i18n/runtime/cookies.ts`). Add `src/app/api/` route handlers only when you need external HTTP endpoints. |

## Feature specs

| Doc | Description |
|-----|-------------|
| [architecture.md](architecture.md) | Layers, modules, ports/adapters, CQRS-lite, composition |
| [web-conventions.md](web-conventions.md) | Development rules: boundaries, imports, Result, policies |
| [i18n.md](i18n.md) | Locale resolution, messages, cookies, SSR, RTL |
| [theme.md](theme.md) | Theme preference, `data-theme`, CSS variables, SSR script, Tailwind |
| [layout-system.md](layout-system.md) | Route-group shells, layout primitives, content arrangements, `LayoutProvider` |
| [shell-mode.md](shell-mode.md) | Shell mode preference, `data-shell-mode`, structural token overrides |
| [maps.md](maps.md) | Provider-agnostic maps (`AppMap` / Leaflet; MapLibre port stub) |
| [images.md](images.md) | `next/image` usage, `remotePatterns`, `sizes`, `priority`, UGC |
| [components/story-container.md](components/story-container.md) | Feed row (`StoryContainer` / `Story`), DTO, demo mocks |
| [feed.md](feed.md) | Feed story list, Lexical comment under story when logged in |
| [object-card.md](object-card.md) | Shared `ObjectCard` (discover, feed links, shop): rating grid, admin heart |
| [discover.md](discover.md) | `/discover` browse by object type, tags, users |
| [components/story-overflow-menu.md](components/story-overflow-menu.md) | ⋯ menu on story cards, edit → editor + draft load |
| [post-article.md](post-article.md) | Single post: feed modal intercept vs full article layout, objects below body |
| [editor-drafts.md](editor-drafts.md) | Editor sidebar (last drafts), autosave, `/drafts` bulk delete |
| [components/avatar.md](components/avatar.md) | Shared `UserAvatar`, `resolveAvatarUrl` (profile + feed) |
| [pages/index.md](pages/index.md) | Page-level specs directory (user profile, ...) |
| [object/navigation.md](object/navigation.md) | Object detail: URL routing, primary tabs, nested `?path=`, breadcrumbs, browser history |
| [object/right-rail.md](object/right-rail.md) | Object detail: right column (Related, Similar, Add-On, Followers previews) |
| [object/gallery.md](object/gallery.md) | Object detail: Gallery tab, album drill-down, add album/image modals |
| [object-updates-feed.md](object-updates-feed.md) | Object detail: `/object/.../updates` feed (filters, cards, query-api) |
| [object-edit.md](object-edit.md) | Object detail: edit mode, left-rail `+` add update modal, ODL `update_create` broadcast |
| [object-followers-feed.md](object-followers-feed.md) | Object detail: `/object/.../followers` list (reuses user social list UI, query-api) |
| [object-authority-feed.md](object-authority-feed.md) | Object detail: `/object/.../authority` administrative & ownership lists |
| [object-follow.md](object-follow.md) | Object detail: Follow/Unfollow + Bell button → ODL `object_follow` broadcast |
| [user-follow.md](user-follow.md) | User profile: Hive follow/unfollow + ODL bell; social lists & following-objects unfollow |
| [pages/user-profile/data-loading.md](pages/user-profile/data-loading.md) | Shell profile fetch (query-api, `QUERY_API_URL`) |
| [auth.md](auth.md) | Auth BFF, httpOnly cookies, `modules/auth`, wallet facade |
| [notifications.md](notifications.md) | Bell dropdown + `/notifications` page (WS feed, unread badge) |

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx dev web` | Local dev server (Turbopack) |
| `pnpm dev:web:webpack` | Dev with **webpack** — use if `next dev` hits **JavaScript heap out of memory** (often after long sessions / Turbopack+HMR growth). Optionally set `NODE_OPTIONS=--max-old-space-size=8192` (or higher) before the command; delete `apps/web/.next` and restart |
| `pnpm nx build web` | Production build |
| `pnpm nx test web` | Unit tests |
