---
id: web-pages-index
title: Page specs — site map
description: Every App Router `page.tsx` under `apps/web/src/app/` maps to a **route area** folder under `pages/`. Cross-cutting behavior (auth, feeds, object card, SEO) stays in the spec root — not duplicated here.
type: spec
status: active
scope: web
tags: [web, pages, index]
updated_at: 2026-10-22
related:
  - docs/apps/web/spec/overview.md
---

# Page specs — site map

**Back:** [web overview](../overview.md)

Every App Router `page.tsx` under `apps/web/src/app/` maps to a **route area** folder under `pages/`. Cross-cutting behavior (auth, feeds, object card, SEO) stays in the spec root — not duplicated here.

## Top-level routes

| Public route | Area folder | Hub spec | Module(s) |
|--------------|-------------|----------|-----------|
| `/` | `home/` | [page.md](home/page.md) | `@/modules/home` (home feed) + hub nav |
| `/discover` | `discover/` | [page.md](discover/page.md) | `@/modules/discover` (hub DISCOVER) |
| `/editor` | `editor/` | [page.md](editor/page.md) | `@/modules/editor` |
| `/drafts` | `drafts/` | [page.md](drafts/page.md) | `@/modules/editor` — tools hub sidebar |
| `/tools` | `tools/` | [page.md](tools/page.md) | redirect → `/notifications/settings` |
| `/settings` | `settings/` | [page.md](settings/page.md) | `@/i18n`, `@/theme`, `@/shell-mode` |
| `/notifications` | `notifications/` | [page.md](notifications/page.md) | `@/modules/notifications` |
| `/object-create` | `object-create/` | [page.md](object-create/page.md) | `@/modules/object-create` |
| `/business` | `business/` | [overview.md](business/overview.md) | `@/modules/business` |
| `/offers`, `/requests` | `business/` | [overview.md](business/overview.md) | `@/modules/business` (public discovery) |
| `/sign-in` | `sign-in/` | [page.md](sign-in/page.md) | `@/modules/auth` |
| `/instacart/:id` | `instacart/` | [page.md](instacart/page.md) | `@/modules/object` wait page → Instacart |
| `/dev/showcase` | `dev/showcase/` | [page.md](dev/showcase/page.md) | layout demo (internal, `status: draft`) |

## Object detail (`/object/:id`)

| Public route pattern | Hub / route spec | Module |
|----------------------|------------------|--------|
| `/object/:id` (+ tab segments, `?path=`) | [page-shell.md](object/page-shell.md) | `@/modules/object` |
| Data loading, SEO model | [data-loading.md](object/data-loading.md) | `object-page-model.server.ts` |
| Tabs, breadcrumbs, history | [navigation.md](object/navigation.md) | `object-page-client.tsx` |
| `/object/:id/reviews` | [routes/reviews.md](object/routes/reviews.md) | Posts / Threads / Activity sub-tabs |
| `/object/:id/updates` | [routes/updates.md](object/routes/updates.md) | object updates feed |
| `/object/:id/updates/:updateId` | [object-update-detail.md](../object-update-detail.md) | single update card (notification deep link) |
| `/object/:id/gallery` | [routes/gallery.md](object/routes/gallery.md) | gallery tab |
| Right rail previews | [routes/right-rail.md](object/routes/right-rail.md) | ref list previews |
| Center ref-list tabs (related, similar, add-on) | [routes/ref-feeds.md](object/routes/ref-feeds.md) | `ObjectRefListFeed` |
| `/object/:id/followers` | [routes/followers.md](object/routes/followers.md) | social list |
| `/object/:id/ownership` | [routes/ownership.md](object/routes/ownership.md) | ownership lists |
| Edit mode UI | [routes/edit-mode.md](object/routes/edit-mode.md) | edit rail + modals |

Cross-cutting: [object-card.md](../object-card.md), [object-follow.md](../object-follow.md), [routing-proxy.md](../routing-proxy.md), [seo.md](../seo.md).

## User profile (`/@:name`)

| Public route pattern | Hub / route spec | Notes |
|----------------------|------------------|-------|
| `/@:name` (shell) | [profile-shell.md](user-profile/profile-shell.md) | Layout tree, regions |
| Profile fetch | [data-loading.md](user-profile/data-loading.md) | query-api |
| `/@:name` feed tabs | [routes/feed.md](user-profile/routes/feed.md) | posts, threads, comments, mentions, activity |
| `/@:name/followers`, `/following`, `/following-objects` | [routes/social-graph.md](user-profile/routes/social-graph.md) | |
| `/@:name/user-shop`, `/recipe` | [routes/user-shop.md](user-profile/routes/user-shop.md) | `@leftSidebar` parallel routes |
| `/@:name/about` | [routes/about.md](user-profile/routes/about.md) | |
| `/@:name/map` | [routes/map.md](user-profile/routes/map.md) | |
| `/@:name/favorites` | [routes/favorites.md](user-profile/routes/favorites.md) | |
| `/@:name/expertise-*` | [routes/expertise.md](user-profile/routes/expertise.md) | |
| `/@:name/reblogs` | [routes/reblogs.md](user-profile/routes/reblogs.md) | |
| `/@:name/transfers/...` | [routes/transfers.md](user-profile/routes/transfers.md) | wallet tabs `?type=` |
| `/@:name/:permlink` (article) | [routes/post-article.md](user-profile/routes/post-article.md) | full article layout |
| Modal intercept `@modal/.../post/[permlink]` | [routes/post-article.md](user-profile/routes/post-article.md) | feed modal vs article |

Nav component: [components/user-menu.md](user-profile/components/user-menu.md). Cross-cutting: [user-follow.md](../user-follow.md).

## App Router files (42 `page.tsx`)

All listed above. Parallel-route slots (`@leftSidebar`, `@modal`) are documented under their parent hub, not as separate site-map rows.

## Adding a page spec

1. Create `pages/<area>/page.md` or `page-shell.md` + optional `routes/*.md`.
2. Add a row to this table.
3. After moving from spec root, update cross-links; optional short-lived stubs at the old path are allowed during migration (web stubs removed — use `pages/` only).
4. Run `pnpm tsx scripts/fix-web-spec-links.ts` and `pnpm knowledge:reindex`.
