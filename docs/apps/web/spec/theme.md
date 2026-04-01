# Theme — `data-theme` + CSS variables

**Back:** [web overview](overview.md) · **Related:** [i18n](i18n.md)

Theming uses `**data-theme` on `<html>`** as the single source of truth for appearance. Tailwind maps semantic color utilities to **CSS variables** defined per theme in `apps/web/src/styles/theme.css`. Do **not** rely on `prefers-color-scheme` via `dark:` as the primary mechanism; use explicit themes (`light`, `dark`, `sepia`) or `**system`** (OS-driven light/dark).

## Normative goals

- Resolve the active **preference** on the **server** (root layout) from cookie and optional user settings; persist **preference**, not the resolved `ThemeId`.
- **SSR:** For non-`system` preferences, set `data-theme` on `<html>` to the resolved `ThemeId`. For `system`, omit `data-theme` on the server and inject a **synchronous** inline script in `<head>` that sets `data-theme` from `matchMedia('(prefers-color-scheme: dark)')` before paint (no flicker).
- **Client:** `ThemeProvider` keeps **preference** in React state; applies `document.documentElement.dataset.theme` to the **resolved** theme; subscribes to `matchMedia` only while `preference === 'system'`.
- **Tailwind:** Colors come from variables (`bg-bg`, `text-fg`, etc.). Avoid hardcoded palette values in components.

## Module layout


| Path                                                | Responsibility                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/src/theme/types.ts`                       | `ThemeId`, `ThemePreference`, `ThemeResolution`                         |
| `apps/web/src/theme/theme-registry.ts`              | Human labels for fixed themes                                           |
| `apps/web/src/theme/resolve-theme.ts`               | Pure `resolveTheme()` — no React/DOM                                    |
| `apps/web/src/theme/theme-cookie.constants.ts`      | Cookie name, Zod schema, max-age                                        |
| `apps/web/src/theme/theme-cookie.ts`                | Server-only read/write for `app_theme`                                  |
| `apps/web/src/theme/get-user-theme-preference.ts`   | Stub until auth; returns `null`                                         |
| `apps/web/src/theme/get-server-theme-resolution.ts` | Cookie + user + optional `Sec-CH-Prefers-Color-Scheme` → `resolveTheme` |
| `apps/web/src/theme/theme-user-sync.ts`             | Optional `WEB_THEME_SYNC_URL` PATCH                                     |
| `apps/web/src/theme/theme-provider.tsx`             | Client provider + `matchMedia` for `system`                             |
| `apps/web/src/theme/theme-script.tsx`               | Inline head script when preference is `system`                          |
| `apps/web/src/theme/use-theme.ts`                   | `useTheme()` hook                                                       |
| `apps/web/src/styles/theme.css`                     | `[data-theme='…']` CSS variables                                        |
| `apps/web/src/components/theme-switcher.tsx`        | UI (shows **preference**, not resolved OS theme)                        |
| `apps/web/src/app/api/theme/route.ts`               | `PATCH` — validate body, set cookie, sync                               |


## Preference resolution

Priority:

1. **User** — `getUserThemePreference()` when it returns a value (auth + backend wired).
2. **Cookie** — `app_theme` (`light`  `dark`  `sepia`  `system`), validated with Zod.
3. **Default** — typically `system`.

When preference is `system`, **resolved** appearance is `dark` or `light` from the OS (`matchMedia` on the client; optional `Sec-CH-Prefers-Color-Scheme` on the server for consistency). **Sepia** is never chosen by the OS.

`resolveTheme()` returns `{ preference, resolvedTheme, source }` where `source` records whether the **preference** came from user, cookie, default, or pure `system` default chain.

## Persistence


| Mechanism          | Content                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| Cookie `app_theme` | Always updated on change (`path: /`, `sameSite: lax`, long `maxAge`).        |
| Backend            | If `WEB_THEME_SYNC_URL` is set, `PATCH` after cookie write (no-op if unset). |


Never persist the resolved `light`/`dark` from `system` — only the preference string.

## CSS and Tailwind

- Variables live under `[data-theme='light']`, `[data-theme='dark']`, `[data-theme='sepia']`, plus `:root` aligned with light for pre-hydration fallback.
- `apps/web/tailwind.config.js` extends `theme.colors` with `bg`, `fg`, `muted`, `border`, `surface`, `accent`, `accent-fg` pointing at `var(--color-*)`.
- `apps/web/src/app/global.css` imports `../styles/theme.css` **before** `@tailwind` directives (required import order for Turbopack).

## Verification


| Command            | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `pnpm nx test web` | Unit tests (including `resolve-theme`)                          |
| `pnpm nx dev web`  | Manual: switch themes, `system` + OS toggle, reload with cookie |


