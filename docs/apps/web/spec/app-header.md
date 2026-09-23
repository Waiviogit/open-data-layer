---
id: web-app-header
title: App header
description: "Global chrome for the `(app)` route group: brand link, predictive search, notifications bell, and session actions. Implemented as `AppHeader` in `@/modules/app-header`, mounted from `apps/web/src/app/(app)/layout.tsx`/layout.tsx)."
type: spec
status: active
scope: web
tags: [web, layout, app-header]
updated_at: 2026-09-23
related:
  - docs/apps/web/spec/overview.md
  - docs/apps/web/spec/search.md
---

# App header

**Back:** [web overview](overview.md) · **Related:** [layout-system](layout-system.md), [search](search.md), [notifications](pages/notifications/page.md), [auth](auth.md)

## Purpose

Global chrome for the `(app)` route group: brand link, predictive search, notifications bell, and session actions. Implemented as `AppHeader` in `@/modules/app-header`, mounted from [`apps/web/src/app/(app)/layout.tsx`](../../../../apps/web/src/app/(app)/layout.tsx).

## Layout

| Zone | Behavior |
|------|----------|
| Brand | Link to `/`; on small screens hidden while mobile search is expanded. Logo on narrow viewports: `h-7` / max ~7.5rem; from `sm`: `h-8`; header row is `flex-nowrap`. |
| Search | Debounced query → `/api/search` — see [search.md](search.md). `lg+`: always visible. Below `lg`: expand/collapse toggle. **Clear** empties the query but keeps search open; **Close (X)** exits search. On `lg+`, Close X sits inside the search field (after Clear, separated by a divider); below `lg`, Close X is the header toggle to the right of the bar. |
| Actions (logged out) | `LoginDialog` + `LocaleSwitcher`. |
| Actions (logged in) | [`LoggedInHeaderActions`](../../../../apps/web/src/modules/app-header/presentation/components/logged-in-header-actions.tsx): **write** → `/editor`; **`NotificationBell`**; avatar → `/@:username`; chevron → account menu. |

### Logged-in account menu

Groups are separated by a hairline. Disabled rows are not links (`aria-disabled`, tooltip `app_header_coming_soon`).

| Item | Behavior |
|------|----------|
| My feed | `/@:username` |
| Profile | `/@:username/about` |
| Wallet | `/@:username/transfers?type=WAIV` |
| Messages | `/@:username/messages` — inbox, not a Posts tab |
| Bookmarks | Disabled |
| Drafts | `/drafts` |
| Vault | Disabled |
| Orders | `/business/relationships` — OBL counterparties and balances |
| Billing | Disabled |
| Settings | `/settings` (locale, theme, shell). Notification prefs stay at `/notifications/settings` in the tools sidebar |
| Logout | `POST /api/auth/logout` + `router.refresh()` |

Create object, Business, and Permissions are not in this menu. `/object-create` stays reachable by URL and from the editor modal. Business discover stays on the section nav. Permissions stays on the wallet submenu.

Notifications UI: [notifications.md](pages/notifications/page.md). Editor entry: [editor.md](pages/editor/page.md).

Sticky bar: `sticky top-0 z-40`, `min-h-shell-header`, nav tokens (`bg-nav-bg`, `border-border`, `backdrop-filter: var(--backdrop-nav)`). Account dropdown uses `z-[60]`.

**iOS sticky scroll:** `AppShell` wraps the header in `.app-header-sticky-slot` (opaque `var(--color-nav-bg)` + compositor hint). `.app-top-header` carries solid nav bg plus `padding-top: max(1px, env(safe-area-inset-top))`; `.app-header-blur::before` extends upward by the same bleed so WebKit does not flash `body.bg-bg` through a subpixel gap during momentum scroll. Root layout exports `viewportFit: 'cover'` so safe-area env vars apply on notched iPhones. Backdrop blur stays on `::before` only — not on the sticky element itself.

## Session

`createCookieAuthContextProvider().getUser()` in the `(app)` layout passes `{ username }` or `null` into the header. No global client auth context.

## Profile link

The profile control uses the public path `/@:name`. Rewrites: [routing-proxy.md](routing-proxy.md).

## Shell mode

Global header does **not** use profile-only helpers (`shouldHideHeroOnDesktop`, etc.). It relies on shared structural tokens such as `--shell-header-height` / `min-h-shell-header`.

## i18n

Message keys prefixed with `app_header_*` (see `en-US.json`); brand copy uses `app_header_brand_text`. Logged-in labels reuse shared keys (`my_feed`, `write_post`, `notifications`, `earn`, etc.).

## Verification

| Check | How |
|-------|-----|
| Search | Type query; dropdown shows objects/users; discover chips navigate |
| Notifications | Bell badge + dropdown — [notifications.md](pages/notifications/page.md) |

## Related code paths

| Path | Role |
|------|------|
| `apps/web/src/modules/app-header/presentation/components/top-nav.tsx` | Search shell |
| `apps/web/src/modules/app-header/presentation/components/logged-in-header-actions.tsx` | Session actions |
