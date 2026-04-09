# App header (Topnav MVP)

**Back:** [web overview](overview.md) · **Related:** [layout-system](layout-system.md), [shell-mode](shell-mode.md), [auth](auth.md)

## Purpose

Global chrome for the `(app)` route group: brand link, search field with debounced MVP stub (no backend), and session actions (sign-in + locale when logged out; profile link + logout when logged in). Implemented as `AppHeader` in `@/modules/app-header`, mounted from [`apps/web/src/app/(app)/layout.tsx`](../../../../apps/web/src/app/(app)/layout.tsx).

## Layout

| Zone | Behavior |
|------|----------|
| Brand | Link to `/`; on small screens hidden while mobile search is expanded. |
| Search | `lg+`: always visible. Below `lg`: expand/collapse via toggle; when expanded, session actions are hidden on mobile only (desktop actions stay visible). |
| Actions | `HeaderActions`: `LoginDialog` + `LocaleSwitcher` when logged out; profile (`/@:name`) + logout when logged in. |

Sticky bar: `sticky top-0 z-40`, `min-h-shell-header`, nav tokens (`bg-nav-bg`, `border-border`, `backdrop-filter: var(--backdrop-nav)`).

## Session

`createCookieAuthContextProvider().getUser()` in the `(app)` layout passes `{ username }` or `null` into the header. No global client auth context.

## Profile link

The profile control uses the public path `/@:name`. [`next.config.js` `rewrites`](../../../../apps/web/next.config.js) map `/@:account` and `/@:account/:path*` to `/user-profile/...`; the address bar stays `/@…`.

## Shell mode

Global header does **not** use profile-only helpers (`shouldHideHero`, etc.). It relies on shared structural tokens such as `--shell-header-height` / `min-h-shell-header`. Optional future presets can add overrides under `[data-shell-mode='…']` in `theme.css` or a dedicated helper in `shell-mode-features.ts`.

## MVP limits

- Search does not call query-api; dropdown shows a placeholder after debounce.
- No notifications, editor shortcut, or overflow menu (legacy `HeaderButton` scope).

## i18n

Message keys prefixed with `app_header_*` (see `en-US.json`); brand copy uses `app_header_brand_text`.
