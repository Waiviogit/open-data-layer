# Shell mode — `data-shell-mode` + structural tokens

**Back:** [web overview](overview.md) · **Related:** [layout system](layout-system.md), [theme](theme.md)

Shell mode adjusts **structural** layout tokens (rail widths, card rhythm) via **`data-shell-mode` on `<html>`**, without changing components. It mirrors the theme stack: cookie, server resolution, client provider, **server action** for persistence, and optional UI switcher.

## Non-profile pages

On routes **outside** the user profile feature, shell mode still applies **CSS token overrides** from `theme.css` (rail widths, `--spacing-card`, etc.). **No** profile-specific component behavior runs there: helpers in `shell-mode-features.ts` are only used from profile/feed UI (e.g. `UserHero`, `UserMenu`, `BlogFeedPostsList`).

## Module layout

| Path | Responsibility |
| ---- | -------------- |
| `apps/web/src/shell-mode/index.ts` | Barrel: types, registry, provider, hook, `resolveShellMode`, `setShellModePreference`, feature helpers |
| `apps/web/src/shell-mode/server.ts` | `getServerShellModeResolution()` — import from server/layout only (cookie + headers) |
| `apps/web/src/shell-mode/types.ts` | `ShellModeId`, `ShellModePreference`, `ShellModeResolution` |
| `apps/web/src/shell-mode/shell-mode-registry.ts` | Human `label` and `description` per mode |
| `apps/web/src/shell-mode/shell-mode-features.ts` | `shouldHideHero`, `shouldUsePostGrid`, `getVisibleMenuKeys`, `shouldCenterMenu` |
| `apps/web/src/shell-mode/resolve-shell-mode.ts` | Pure `resolveShellMode()` |
| `apps/web/src/shell-mode/shell-mode-cookie.constants.ts` | Cookie name `app_shell_mode`, Zod schema, max-age |
| `apps/web/src/shell-mode/shell-mode-cookie.ts` | Server read/write for the cookie |
| `apps/web/src/shell-mode/get-server-shell-mode-resolution.ts` | Cookie → `resolveShellMode()` |
| `apps/web/src/shell-mode/actions.ts` | `'use server'` — `setShellModePreference` (validate, set cookie) |
| `apps/web/src/shell-mode/shell-mode-provider.tsx` | Client: sync `dataset.shellMode`, call `setShellModePreference` |
| `apps/web/src/shell-mode/use-shell-mode.ts` | `useShellMode()` hook |
| `apps/web/src/styles/theme.css` | `[data-shell-mode='…']` token overrides, profile/grid classes (see below) |
| `apps/web/src/shared/presentation/components/shell-mode-switcher.tsx` | Button group |

## Available modes

| Mode | Effect (defaults; see `theme.css`) |
| ---- | ----------------------------------- |
| `default` | Base theme shell tokens (no extra block). |
| `twitter` | Wider right rail; `--spacing-card` slightly tighter than default. On **user profile** routes, **no profile hero card** (`UserHeader` + horizontal menu are not rendered); the same `UserMenu` appears **vertically** in the left rail (see below). |
| `instagram` | No left/right profile rails (full-width main). Small card gap. On the profile **posts** tab, posts use a **square image preview grid** with **6 columns from 1024px** viewport up; column rules live in `theme.css` (`.instagram-post-grid`, `.shell-profile-grid`). **`UserMenu`** shows only **Posts** and **Wallet** (feed sub-tabs hidden; wallet sub-tabs unchanged). |
| `compact` | **CSS-only** token changes (denser rails and card rhythm). **No** profile component-level behavioral overrides — same components as `default`. |

## CSS class inventory (profile / shell)

| Class | Role |
| ----- | ---- |
| `.shell-profile-grid` | Profile `(main)` grid; in Instagram mode, forced to a single full-width column via `html[data-shell-mode='instagram']`. |
| `.shell-profile-left-rail` | Left column wrapper (sidebar and/or Twitter vertical menu rail). |
| `.shell-hide-twitter` / `.shell-show-twitter` | Toggle which subtree is visible when mode is Twitter (swap default sidebar vs vertical menu). |
| `.shell-hide-instagram` | Elements hidden in Instagram mode (side rails). |
| `.instagram-post-grid` | Post preview grid: column counts and 1px gap (see `theme.css` breakpoints). |

Instagram layout overrides use **`html[data-shell-mode='instagram'] …`** selectors so they **outrank** conflicting Tailwind utilities without `!important`.

## Persistence and resolution

1. **Server** — `getServerShellModeResolution()` (from `@/shell-mode/server`) reads the cookie; invalid values fall back to `default`.
2. **SSR** — Root layout sets `data-shell-mode={resolvedMode}` on `<html>`.
3. **Client** — `ShellModeProvider` updates React state and calls **`setShellModePreference`** (server action) so the cookie matches the user’s choice. **`data-shell-mode` on `<html>` updates immediately** from client state, so layout does not wait for a full navigation.

## JS vs CSS visibility (rationale)

- **Twitter / Instagram side rails** — Toggled with **CSS** (`.shell-hide-twitter` / `.shell-show-twitter`, `.shell-hide-instagram`) so switching mode updates the shell **without** a navigation and without branching which subtree mounts on the server.
- **Twitter profile hero** — **`UserHero` returns `null`** when `shouldHideHero(mode)` is true, so the heavy subtree (cover, avatar, stats) is **not** rendered. That is a deliberate **performance** trade-off vs wrapping the hero in a CSS-hidden container.
- **Instagram post grid vs Story list** — **`BlogFeedPostsList`** branches in **JS** (`shouldUsePostGrid`) because the component trees differ (`FeedPostGrid` vs `FeedList`).
- **Instagram primary nav filter** — **`UserMenu`** uses **`getVisibleMenuKeys`** in JS because it filters link data, not just visibility.

## Twitter profile: no hero + CSS visibility (single menu)

`UserHero` returns **`null`** when **`shouldHideHero(resolvedMode)`** — no profile header (avatar, stats, bio) and no horizontal hero menu.

Profile shells still render **both** the default left sidebar and the vertical `UserMenu` rail; visibility is toggled with classes defined in `theme.css`:

- **`shell-hide-twitter`** — visible in non-Twitter modes; **`display: none`** when `[data-shell-mode='twitter']`.
- **`shell-show-twitter`** — hidden by default; **`display: block`** when `[data-shell-mode='twitter']`.

That keeps a **single** `UserMenu` implementation (horizontal in the hero vs vertical in the rail) and avoids server-only cookie reads for “which variant to mount,” so switching shell mode updates the UI without a refresh.

## Instagram profile: full-width main + post preview grid

Profile `(main)` layout uses **`shell-profile-grid`**: when mode is `instagram`, **`shell-hide-instagram`** hides the left rail (sidebar + Twitter vertical menu wrapper) and the right rail; **`grid-template-columns: 1fr`** makes the main column full width.

`BlogFeedPostsList` (posts tab) renders `FeedPostGrid` when **`shouldUsePostGrid(resolvedMode)`** and the posts tab are active. The grid uses **`theme.css`** for `grid-template-columns` (2 → 3 → 4 → **6** from the `1024px` breakpoint) and **1px** gap so column counts track the wide main area.

`UserMenu` uses **`getVisibleMenuKeys(resolvedMode)`**: in Instagram mode, primary links are limited to **`feed`** (Posts) and **`transfers`** (Wallet); the feed secondary row (threads, comments, …) is omitted. Horizontal nav rows use **`justify-center`** when **`shouldCenterMenu(resolvedMode)`** (not applied to the vertical Twitter rail).

## Writing shell-aware components

Build profile and feed UI so new shell presets and refactors stay localized: **one barrel import**, **feature helpers** for behavior, **structural CSS variables** for layout, **CSS vs JS** chosen deliberately.

### CSS vs JS visibility

| Approach | When to use |
| -------- | ----------- |
| **CSS** (`.shell-hide-<mode>` / `.shell-show-<mode>`) | Same component subtree in every mode; you only need show/hide. Toggle is instant and does not change what React mounts. |
| **JS** (`return null`, conditional render, filtered data) | Different component trees (`FeedPostGrid` vs `FeedList`), heavy hidden subtree that should not mount (`UserHero`), or filtering links/data (`UserMenu`). |

For Instagram-specific layout overrides that must beat Tailwind utilities on the same element, use **`html[data-shell-mode='instagram'] …`** in `theme.css` (see existing `.shell-profile-grid` / `.instagram-post-grid` rules).

### Rules for new or edited components

1. **Barrel only** — import from `@/shell-mode` (types, `useShellMode`, feature helpers). Server-only resolution: `@/shell-mode/server` in layouts.
2. **`useShellMode()`** — client components only (`'use client'`). Server Components do not read shell cookie; they rely on CSS tokens and markup that client children adjust.
3. **No raw mode strings** — use existing helpers in `shell-mode-features.ts` or add a new exported function there; do not compare `resolvedMode === 'twitter'` in feature files.
4. **Structural tokens** — profile grids should use `var(--shell-left-width)`, `var(--shell-right-width)`, `gap-card-padding` / `--spacing-card` patterns so `[data-shell-mode='…']` blocks in `theme.css` apply without per-component hacks.
5. **New CSS visibility classes** — name them `shell-hide-<mode>` / `shell-show-<mode>` (or existing profile classes like `shell-profile-grid`), define behavior under `[data-shell-mode='<mode>']` in `theme.css`, and document them in the [CSS class inventory](#css-class-inventory-profile--shell) above.

### Examples

**CSS toggle** — both variants stay mounted; CSS picks visibility (see `apps/web/src/app/(app)/user-profile/[name]/(main)/layout.tsx`):

```tsx
<div className="shell-hide-twitter">
  <LeftSidebar />
</div>
<div className="shell-show-twitter">
  <UserMenuVerticalRail />
</div>
```

**JS toggle** — different trees or heavy subtree; use helpers from `@/shell-mode`:

```tsx
const { resolvedMode } = useShellMode();
if (shouldUsePostGrid(resolvedMode)) {
  return <FeedPostGrid items={items} />;
}
return <FeedList items={items} feedTab={feedTab} />;
```

## Adding a new mode

1. **Types** — Add the id to `ShellModeId` / Zod enum in `shell-mode-cookie.constants.ts`.
2. **Registry** — Add `label` / `description` in `shell-mode-registry.ts`.
3. **Features** — If profile behavior differs, extend `shell-mode-features.ts` and consume from components.
4. **CSS** — Add `[data-shell-mode='<id>'] { … }` in `theme.css` with the structural variables to override (`--shell-left-width`, `--shell-right-width`, `--spacing-card`, etc.).

No component changes are required if layouts already use those tokens and no new profile behavior is needed.

## Switcher

Use `ShellModeSwitcher` from `@/shared/presentation` inside any client tree under `ShellModeProvider` (root layout provides it).
