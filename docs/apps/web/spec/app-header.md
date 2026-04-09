# App header (Topnav MVP)

**Back:** [web overview](overview.md) · **Related:** [layout-system](layout-system.md), [shell-mode](shell-mode.md), [auth](auth.md)

## Purpose

Global chrome for the `(app)` route group: brand link, search field with debounced MVP stub (no backend), and session actions. Implemented as `AppHeader` in `@/modules/app-header`, mounted from [`apps/web/src/app/(app)/layout.tsx`](../../../../apps/web/src/app/(app)/layout.tsx).

## Layout

| Zone | Behavior |
|------|----------|
| Brand | Link to `/`; on small screens hidden while mobile search is expanded. |
| Search | `lg+`: always visible. Below `lg`: expand/collapse via toggle; when expanded, session actions are hidden on mobile only (desktop actions stay visible). |
| Actions (logged out) | `LoginDialog` + `LocaleSwitcher`. |
| Actions (logged in) | [`LoggedInHeaderActions`](../../../../apps/web/src/modules/app-header/presentation/components/logged-in-header-actions.tsx): **write** icon links to [`/editor`](../../../../apps/web/src/app/(app)/editor/page.tsx); notifications icon (disabled, “coming soon”); avatar as link to `/@:username`; chevron opens account menu. |

### Logged-in account menu (MVP)

| Item | Behavior |
|------|----------|
| My feed | Link to `/@:username` (profile posts feed). |
| Earn, Tools, Drafts, Profile, Wallet, Settings | Disabled placeholders. |
| Logout | `POST /api/auth/logout` + `router.refresh()`. |

The **notifications** header button remains a disabled placeholder (same “coming soon” tooltip via `app_header_coming_soon`). See [editor.md](editor.md) for the write flow.

Sticky bar: `sticky top-0 z-40`, `min-h-shell-header`, nav tokens (`bg-nav-bg`, `border-border`, `backdrop-filter: var(--backdrop-nav)`). Account dropdown panel uses `z-[60]` so it stacks above the bar.

## Session

`createCookieAuthContextProvider().getUser()` in the `(app)` layout passes `{ username }` or `null` into the header. No global client auth context.

## Profile link

The profile control uses the public path `/@:name`. [`next.config.js` `rewrites`](../../../../apps/web/next.config.js) map `/@:account` and `/@:account/:path*` to `/user-profile/...`; the address bar stays `/@…`.

## Shell mode

Global header does **not** use profile-only helpers (`shouldHideHero`, etc.). It relies on shared structural tokens such as `--shell-header-height` / `min-h-shell-header`. Optional future presets can add overrides under `[data-shell-mode='…']` in `theme.css` or a dedicated helper in `shell-mode-features.ts`.

## MVP limits

- Search does not call query-api; dropdown shows a placeholder after debounce.
- Notifications in the header is non-functional until wired.
- Account menu: only **My feed** and **Logout** navigate or sign out; other rows are inert.

## i18n

Message keys prefixed with `app_header_*` (see `en-US.json`); brand copy uses `app_header_brand_text`. Logged-in labels reuse shared keys (`my_feed`, `write_post`, `notifications`, `earn`, etc.).
