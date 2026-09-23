---
id: web-pages-user-profile-profile-shell
title: User profile shell
description: Describe the App Router layout tree, public URLs, and persistent regions for every route under a Hive account profile. Child route behavior lives in `routes/*.md`.
type: spec
status: active
scope: web
tags: [web, page, user-profile, routing, layout]
updated_at: 2026-06-10
related:
  - docs/apps/web/spec/overview.md
  - docs/apps/web/spec/pages/index.md
  - docs/apps/web/spec/pages/user-profile/data-loading.md
  - docs/apps/web/spec/routing-proxy.md
  - docs/apps/web/spec/layout-system.md
  - docs/apps/web/spec/pages/user-profile/components/user-menu.md
---

# User profile shell (`/@:name`)

**Back:** [Pages index](../index.md) · [web overview](../../overview.md) · **Related:** [data-loading](data-loading.md), [routing-proxy](../../routing-proxy.md), [layout-system](../../layout-system.md)

## Purpose

Describe the App Router layout tree, public URLs, and persistent regions for every route under a Hive account profile. Child route behavior lives in `routes/*.md`.

## Public URLs

| Public URL | App Router path | Notes |
|------------|-----------------|-------|
| `/@:account` | `/user-profile/:account` | Default posts feed — rewrite in [`proxy.ts`](../../../../../apps/web/src/proxy.ts) |
| `/@:account/:segment/...` | `/user-profile/:account/:segment/...` | When first segment is a [reserved profile segment](https://github.com/opden-data-layer/opden-data-layer/blob/main/apps/web/src/modules/user-profile/presentation/components/profile-path.ts) |
| `/@:account/:permlink/...` | `/user-profile/:account/post/:permlink/...` | Post permalinks when first segment is **not** reserved |

`next.config.js` documents that `/@…` rewrites are handled in `proxy.ts` (not static rewrites) so client `<Link href="/@…">` navigations work.

## Layout tree

```
user-profile/[name]/layout.tsx          validate name + load profile (404 if missing)
  (profile)/layout.tsx                  UserProfileHeroClient + social counts provider
    (main)/layout.tsx                   three-column shell (left parallel route + main + right rail)
      @leftSidebar/*                    category nav for shop/recipe (parallel route)
      page.tsx, threads/, followers/, …
    about/layout.tsx                    main + right rail only
    map/layout.tsx                      single column
    permissions/layout.tsx              single column
    transfers/waiv-table/layout.tsx     single column
  (article)/layout.tsx                  full-width post article (no profile hero grid)
    post/[permlink]/page.tsx
```

| Layout file | Grid / regions |
|-------------|----------------|
| [`(main)/layout.tsx`](../../../../../apps/web/src/app/(app)/user-profile/[name]/(profile)/(main)/layout.tsx) | `shell-profile-grid`: left `@leftSidebar` (sticky) + center `main` + `RightSidebar` at `lg+`. Twitter shell mode swaps left rail to vertical `UserMenuVerticalRail`. |
| [`about/layout.tsx`](../../../../../apps/web/src/app/(app)/user-profile/[name]/(profile)/about/layout.tsx) | No left rail; main + right sidebar. |
| [`map/layout.tsx`](../../../../../apps/web/src/app/(app)/user-profile/[name]/(profile)/map/layout.tsx) | Single full-width column (no sidebars). |
| [`permissions/layout.tsx`](../../../../../apps/web/src/app/(app)/user-profile/[name]/(profile)/permissions/layout.tsx) | Single full-width column (no sidebars). |
| [`transfers/waiv-table/layout.tsx`](../../../../../apps/web/src/app/(app)/user-profile/[name]/(profile)/transfers/waiv-table/layout.tsx) | Single column for wallet table. |

## Persistent regions

| Region | Component | When hidden |
|--------|-----------|-------------|
| Hero | `UserProfileHeroClient`. A cover fills the identity band down to the primary nav (min 240px) with a bottom scrim. | `(profile)/layout.tsx` only — not on `(article)/post/*` |
| Primary nav | `UserMenu` in hero | See [user-menu.md](components/user-menu.md) |
| Left rail | `@leftSidebar` → `ProfileAccountSidebar` on default routes; category nav on shop/recipe; `FavoritesTypeNav` on favorites; vertical `UserMenu` in twitter mode | Hidden below `lg` |
| Center | Route `page.tsx` children | — |
| Right rail | `RightSidebar` | Hidden on `map`, `waiv-table`; hidden below `lg` on `(main)` |

## Module layout

| Module | Role |
|--------|------|
| `@/modules/user-profile` | Shell queries, hero, menu, sidebars, shop/recipe main content |
| `@/modules/user-social` | Followers/following/following-objects lists |
| `@/modules/feed` | Profile feed tabs (posts, threads, comments, mentions, activity) |

## Data loading

Shell profile fetch: [data-loading.md](data-loading.md). `(profile)/layout.tsx` also loads following-objects count head for hero badges.

## Route specs

| Area | Spec |
|------|------|
| Feed tabs | [routes/feed.md](routes/feed.md) |
| Social lists | [routes/social-graph.md](routes/social-graph.md) |
| Shop / recipe | [routes/user-shop.md](routes/user-shop.md) |
| About | [routes/about.md](routes/about.md) |
| Map | [routes/map.md](routes/map.md) |
| Favorites | [routes/favorites.md](routes/favorites.md) |
| Expertise | [routes/expertise.md](routes/expertise.md) |
| Account sidebar | [components/account-sidebar.md](components/account-sidebar.md) |
| Reblogs | [routes/reblogs.md](routes/reblogs.md) |
| Wallet / transfers | [routes/transfers.md](routes/transfers.md) |
| Permissions | [routes/permissions.md](routes/permissions.md) |
| Post article / modal | [routes/post-article.md](routes/post-article.md) |

## Verification

| Command | Purpose |
|---------|---------|
| `pnpm nx run web:typecheck` | Layout and parallel-route types |
| Manual | Open `/@alice`, `/@alice/followers`, `/@alice/user-shop` — address bar stays `/@…` |

## Related code paths

| Path | Role |
|------|------|
| `apps/web/src/proxy.ts` | `/@account` → `/user-profile/…` rewrites |
| `apps/web/src/modules/user-profile/presentation/components/profile-path.ts` | Reserved segments + active nav helpers |
| `apps/web/src/app/(app)/user-profile/[name]/layout.tsx` | Name validation + profile gate |
