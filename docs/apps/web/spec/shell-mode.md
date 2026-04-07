# Shell mode — `data-shell-mode` + structural tokens

**Back:** [web overview](overview.md) · **Related:** [layout system](layout-system.md), [theme](theme.md)

Shell mode adjusts **structural** layout tokens (rail widths, card rhythm) via **`data-shell-mode` on `<html>`**, without changing components. It mirrors the theme stack: cookie, server resolution, client provider, **server action** for persistence, and optional UI switcher.

## Module layout

| Path | Responsibility |
| ---- | -------------- |
| `apps/web/src/shell-mode/types.ts` | `ShellModeId`, `ShellModePreference`, `ShellModeResolution` |
| `apps/web/src/shell-mode/shell-mode-registry.ts` | Human `label` and `description` per mode |
| `apps/web/src/shell-mode/resolve-shell-mode.ts` | Pure `resolveShellMode()` |
| `apps/web/src/shell-mode/shell-mode-cookie.constants.ts` | Cookie name `app_shell_mode`, Zod schema, max-age |
| `apps/web/src/shell-mode/shell-mode-cookie.ts` | Server read/write for the cookie |
| `apps/web/src/shell-mode/get-server-shell-mode-resolution.ts` | Cookie → `resolveShellMode()` |
| `apps/web/src/shell-mode/actions.ts` | `'use server'` — `setShellModePreference` (validate, set cookie) |
| `apps/web/src/shell-mode/shell-mode-provider.tsx` | Client: sync `dataset.shellMode`, call `setShellModePreference` |
| `apps/web/src/shell-mode/use-shell-mode.ts` | `useShellMode()` hook |
| `apps/web/src/styles/theme.css` | `[data-shell-mode='…']` token overrides + `.shell-hide-twitter` / `.shell-show-twitter` |
| `apps/web/src/shared/presentation/components/shell-mode-switcher.tsx` | Button group |

## Available modes

| Mode | Effect (defaults; see `theme.css`) |
| ---- | ----------------------------------- |
| `default` | Base theme shell tokens (no extra block). |
| `twitter` | Wider right rail; `--spacing-card` slightly tighter than default. On **user profile** `(main)` routes, the same `UserMenu` appears **vertically** in the left rail; the hero’s horizontal menu is hidden via CSS (see below). |
| `instagram` | Icon-style left rail, no right rail, small card gap. |
| `compact` | Denser rails and card rhythm. |

## Persistence and resolution

1. **Server** — `getServerShellModeResolution()` reads the cookie; invalid values fall back to `default`.
2. **SSR** — Root layout sets `data-shell-mode={resolvedMode}` on `<html>`.
3. **Client** — `ShellModeProvider` updates React state and calls **`setShellModePreference`** (server action) so the cookie matches the user’s choice. **`data-shell-mode` on `<html>` updates immediately** from client state, so layout does not wait for a full navigation.

## Twitter profile: CSS visibility (no second menu)

Profile shells render **both** the default left sidebar and the vertical `UserMenu` rail; visibility is toggled with classes defined in `theme.css`:

- **`shell-hide-twitter`** — visible in non-Twitter modes; **`display: none`** when `[data-shell-mode='twitter']`.
- **`shell-show-twitter`** — hidden by default; **`display: block`** when `[data-shell-mode='twitter']`.

That keeps a **single** `UserMenu` implementation (horizontal in the hero vs vertical in the rail) and avoids server-only cookie reads for “which variant to mount,” so switching shell mode updates the UI without a refresh.

## Adding a new mode

1. **Types** — Add the id to `ShellModeId` / Zod enum in `shell-mode-cookie.constants.ts`.
2. **Registry** — Add `label` / `description` in `shell-mode-registry.ts`.
3. **CSS** — Add `[data-shell-mode='<id>'] { … }` in `theme.css` with the structural variables to override (`--shell-left-width`, `--shell-right-width`, `--spacing-card`, etc.).

No component changes are required if layouts already use those tokens.

## Switcher

Use `ShellModeSwitcher` from `@/shared/presentation` inside any client tree under `ShellModeProvider` (root layout provides it).
