---
id: web-overview
title: web (Next.js)
description: Next.js frontend — BFF, shell mode, i18n, object UI, and app conventions.
type: overview
status: active
scope: web
tags: [web, overview]
updated_at: 2026-09-24
related:
  - docs/apps/web/spec/architecture.md
  - docs/apps/web/spec/web-conventions.md
  - docs/README.md
---

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
| Server actions / cookies | Theme, shell mode, and locale use `'use server'` modules (e.g. `theme/actions.ts`, `shell-mode/actions.ts`, `i18n/runtime/cookies.ts`). BFF route handlers under `src/app/api/` — see [bff-api.md](bff-api.md). |

## Feature specs

### Pages (URL trees)

Route-area specs live under [`pages/`](pages/index.md). Start at the [site map](pages/index.md) for every `page.tsx` route, hub layout, and child tab.

| Hub | Description |
|-----|-------------|
| [pages/index.md](pages/index.md) | Full site map: route → area folder → hub spec |
| [pages/object/page-shell.md](pages/object/page-shell.md) | Object detail layout, regions, edit vs browse |
| [pages/user-profile/profile-shell.md](pages/user-profile/profile-shell.md) | Profile layout tree, `/@:name` URLs |
| [pages/business/overview.md](pages/business/overview.md) | OBL Business UI: `/business`, `/offers`, `/requests` |

Do **not** duplicate page-route detail in this file — link the site map or the relevant `pages/<area>/` hub.

### Cross-cutting

| Doc | Description |
|-----|-------------|
| [architecture.md](architecture.md) | Layers, modules, ports/adapters, CQRS-lite, composition |
| [web-conventions.md](web-conventions.md) | Development rules: boundaries, imports, Result, policies |
| [routing-proxy.md](routing-proxy.md) | `proxy.ts` rewrites, session refresh, `/@` and object tab URLs |
| [has-deep-link-redirect.md](has-deep-link-redirect.md) | Public `/has` page — https link → Keychain Mobile for agent-wallet chat login |
| [seo.md](seo.md) | Metadata, JSON-LD, canonical, sitemap, robots |
| [i18n.md](i18n.md) | Locale resolution, messages, cookies, SSR, RTL |
| [theme.md](theme.md) | Theme preference, `data-theme`, CSS variables, SSR script, Tailwind |
| [layout-system.md](layout-system.md) | Route-group shells, layout primitives, content arrangements, `LayoutProvider` |
| [shell-mode.md](shell-mode.md) | Shell mode preference, `data-shell-mode`, structural token overrides |
| [maps.md](maps.md) | Provider-agnostic maps (`AppMap` / Leaflet; MapLibre port stub) |
| [images.md](images.md) | `next/image` usage, `remotePatterns`, `sizes`, `priority`, UGC |
| [icons.md](icons.md) | `@/icons` adapter (lucide-react), registry, custom pack, ESLint guards |
| [auth.md](auth.md) | Auth BFF, httpOnly cookies, `modules/auth`, wallet facade |
| [bff-api.md](bff-api.md) | `src/app/api/**/route.ts` → upstream services |
| [app-header.md](app-header.md) | Global header, search, notifications bell, account menu |
| [search.md](search.md) | Header search BFF → query-api |
| [feed.md](feed.md) | Feed story list, Lexical comment under story when logged in |
| [messaging.md](messaging.md) | Profile inbox + object channel chat (OSL messaging UI) |
| [pages/user-profile/routes/activity.md](pages/user-profile/routes/activity.md) | Profile activity tab — Hive account history cards |
| [object-card.md](object-card.md) | Shared `ObjectCard` (discover, feed links, shop): rating grid, admin heart |
| [object-create-broadcast.md](object-create-broadcast.md) | Object create: `custom_json` chunking, IPFS path, publish dock size |
| [object-follow.md](object-follow.md) | Object detail: Follow/Unfollow + Bell → ODL `object_follow` broadcast |
| [object-update-detail.md](object-update-detail.md) | Deep link `/object/:id/updates/:updateId` from notifications |
| [user-follow.md](user-follow.md) | Hive follow/unfollow + ODL bell; social list actions |
| [scroll-restoration.md](scroll-restoration.md) | History-entry scroll memory and pre-paint scroll-to-top on detail routes |

### Components

| Doc | Description |
|-----|-------------|
| [components/story-container.md](components/story-container.md) | Feed row (`StoryContainer` / `Story`), DTO, demo mocks |
| [components/story-overflow-menu.md](components/story-overflow-menu.md) | ⋯ menu on story cards, edit → editor + draft load |
| [components/avatar.md](components/avatar.md) | Shared `UserAvatar`, `resolveAvatarUrl` (profile + feed) |

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx dev web` | Local dev server (Turbopack) — **does not typecheck** |
| `pnpm dev:web:webpack` | Dev with **webpack** — use if `next dev` hits **JavaScript heap out of memory** |
| husky `pre-push` | When `apps/web/**` or `libs/**` change in pushed commits, runs `pnpm typecheck:web` |
| `pnpm typecheck:web` | `tsc --noEmit` for `apps/web` (also CI `verify.yml`) |
| `pnpm nx build web` | Production build |
| `pnpm nx run web:verify-production-build` | Full `next build` smoke before Docker image |
| `pnpm nx test web` | Unit tests |
| `pnpm knowledge:reindex` | Refresh knowledge-api index after doc changes |
