# Shell mode — `data-shell-mode` + structural tokens

**Back:** [web overview](overview.md) · **Related:** [layout system](layout-system.md), [theme](theme.md)

Shell mode adjusts **structural** layout tokens (rail widths, card rhythm) via **`data-shell-mode` on `<html>`**, without changing components. It mirrors the theme stack: cookie, server resolution, client provider, API route, and optional UI switcher.

## Module layout

| Path | Responsibility |
| ---- | -------------- |
| `apps/web/src/shell-mode/types.ts` | `ShellModeId`, `ShellModePreference`, `ShellModeResolution` |
| `apps/web/src/shell-mode/shell-mode-registry.ts` | Human `label` and `description` per mode |
| `apps/web/src/shell-mode/resolve-shell-mode.ts` | Pure `resolveShellMode()` |
| `apps/web/src/shell-mode/shell-mode-cookie.constants.ts` | Cookie name `app_shell_mode`, Zod schema, max-age |
| `apps/web/src/shell-mode/shell-mode-cookie.ts` | Server read/write for the cookie |
| `apps/web/src/shell-mode/get-server-shell-mode-resolution.ts` | Cookie → `resolveShellMode()` |
| `apps/web/src/shell-mode/shell-mode-provider.tsx` | Client: sync `dataset.shellMode`, `PATCH /api/shell-mode` |
| `apps/web/src/shell-mode/use-shell-mode.ts` | `useShellMode()` hook |
| `apps/web/src/styles/theme.css` | `[data-shell-mode='…']` token overrides |
| `apps/web/src/shared/presentation/components/shell-mode-switcher.tsx` | Button group |
| `apps/web/src/app/api/shell-mode/route.ts` | `PATCH` — validate body, set cookie |

## Available modes

| Mode | Effect (defaults; see `theme.css`) |
| ---- | ----------------------------------- |
| `default` | Base theme shell tokens (no extra block). |
| `twitter` | Narrower left rail, wider right rail, tighter card gap. |
| `instagram` | Icon-style left rail, no right rail, small card gap. |
| `compact` | Denser rails and card rhythm. |

## Persistence and resolution

1. **Server** — `getServerShellModeResolution()` reads the cookie; invalid values fall back to `default`.
2. **SSR** — Root layout sets `data-shell-mode={resolvedMode}` on `<html>`.
3. **Client** — `ShellModeProvider` keeps preference in sync and updates the cookie via `PATCH /api/shell-mode` when the user changes mode.

## Adding a new mode

1. **Types** — Add the id to `ShellModeId` / Zod enum in `shell-mode-cookie.constants.ts`.
2. **Registry** — Add `label` / `description` in `shell-mode-registry.ts`.
3. **CSS** — Add `[data-shell-mode='<id>'] { … }` in `theme.css` with the structural variables to override (`--shell-left-width`, `--shell-right-width`, `--spacing-card`, etc.).

No component changes are required if layouts already use those tokens.

## Switcher

Use `ShellModeSwitcher` from `@/shared/presentation` inside any client tree under `ShellModeProvider` (root layout provides it).
