# Layout system

**Back:** [web overview](overview.md) · **Related:** [architecture](architecture.md), [theme](theme.md)

This spec describes **structural** layout only (zones, breakpoints, scroll/sticky behavior). It does **not** cover colors, shadows, or domain data loading.

## Goals

- **Shells** — which outer chrome applies (app, public, immersive) via Next.js **route groups**.
- **Regions** — reusable wrappers (`StickyRegion`, `HiddenBelow`, drawers) for rails and sidebars.
- **Content arrangements** — inner layout of the primary column (`FeedColumn`, `CardGrid`, `MasonryGrid`, `CenteredArticle`).
- **Layout state** — `LayoutProvider` for client-only UI (sidebar toggles, feed vs grid mode) without a global store.
- **Shell mode** — optional `data-shell-mode` presets that override structural tokens (rail widths, card rhythm); see [shell-mode.md](shell-mode.md).

## Where to look

| Path | Role |
| ---- | ---- |
| `apps/web/src/shared/presentation/layout/` | Barrel exports: shells, regions, arrangements, `LayoutProvider`, `BREAKPOINTS` |
| `apps/web/src/shell-mode/` | Shell mode types, cookie, resolution, `ShellModeProvider` (see [shell-mode.md](shell-mode.md)) |
| `apps/web/src/app/(app)/dev/showcase/page.tsx` | Dev **showcase** — layout primitives, switchers, token sampler (`/dev/showcase`) |
| `apps/web/src/app/(app)/layout.tsx` | `LayoutProvider` + `AppShell` + [`AppHeader`](app-header.md) / `BottomNav` |
| `apps/web/src/app/(public)/layout.tsx` | `PublicShell` — centered narrow column |
| `apps/web/src/app/(immersive)/layout.tsx` | `ImmersiveShell` — fullscreen, no chrome |
| `apps/web/src/app/(app)/user-profile/[name]/layout.tsx` | Profile hero + `children` (no grid; grid lives in nested layouts) |
| `apps/web/src/app/(app)/user-profile/[name]/(main)/layout.tsx` | Default profile: three-column **lg+** rail + main + rail |
| `apps/web/src/app/(app)/user-profile/[name]/about/layout.tsx` | About: main + right rail only |
| `apps/web/src/app/(app)/user-profile/[name]/map/layout.tsx` | Map: single column |
| `apps/web/src/app/(app)/user-profile/[name]/transfers/waiv-table/layout.tsx` | Waiv table: single column |

Route groups `(app)`, `(public)`, `(immersive)` do **not** appear in URLs.

## Shells

| Component | Use when |
| --------- | -------- |
| `AppShell` | Standard app pages: optional `header`, `leftNav`, `rightRail`, `bottomNav`, primary `children`. Grid columns use `--shell-left-width` / `--shell-right-width` at `lg+`. |
| `PublicShell` | Marketing / auth-style centered content (`max-w-container-narrow`). |
| `ImmersiveShell` | Full-screen experiences (compose, media viewer). |

Override grid with `gridTemplateClassName` on `AppShell` when a route needs a non-default column template.

## Regions

| Component | Behavior |
| --------- | -------- |
| `StickyRegion` | `position: sticky` with configurable `offset` (CSS length). |
| `HiddenBelow` | `hidden` below breakpoint; visible from breakpoint up (`sm`–`xl`). No JS. |
| `CollapsibleRegion` | Client: toggle on small screens; always visible on `lg+`. Optional `localStorage` via `storageKey`. |
| `DrawerRegion` | Client: fixed overlay + panel; backdrop and `Escape` close. |

## Content arrangements

| Component | Behavior |
| --------- | -------- |
| `FeedColumn` | `flex flex-col gap-card-padding` — single-column feeds and lists. |
| `CardGrid` | Responsive CSS grid; `columns` per breakpoint (`base`, `sm`, …). Dynamic column classes are **safelisted** in `tailwind.config.js`. |
| `MasonryGrid` | CSS `columns` with `column-gap` token; children may need `break-inside-avoid`. |
| `CenteredArticle` | `max-w-container-content` centered article column. |

### Switching arrangements (Layout context)

Use `useLayout().setContentArrangement` to switch between `feed`, `grid`, and `masonry` for client-driven profile or feed UIs. This is **UI state** only — route-level shells and CSS grids still own the outer frame.

## Shell mode

Structural presets (`default`, `twitter`, `instagram`, `compact`) set `data-shell-mode` on `<html>` and override tokens such as `--shell-left-width` / `--spacing-card`. Full flow and how to add a mode: [shell-mode.md](shell-mode.md).

## Breakpoints

`BREAKPOINTS` in `shared/presentation/layout/breakpoints.ts` matches Tailwind defaults (`sm` … `2xl`) as CSS length strings for `useMediaQuery` and documentation.

## Layout presets (documentation)

`PROFILE_LAYOUT_PRESETS` in `modules/user-profile/presentation/layout-presets.ts` documents **valid combinations** of arrangement + sidebar flags for profile-style pages. It is **not** wired into the layout runtime — use as a reference for agents and implementers.

## Showcase page

Visit **`/dev/showcase`** for live examples: shells, regions, arrangements, `ThemeSwitcher`, `ShellModeSwitcher`, `LocaleSwitcher`, and a token sampler.

## Layout context

`LayoutProvider` wraps `apps/web/src/app/(app)/layout.tsx`. Consumers use `useLayout()` from `@/shared/presentation/layout` for:

- `leftNavOpen` / `toggleLeftNav`
- `rightRailOpen` / `toggleRightRail`
- `contentArrangement` / `setContentArrangement` (`feed` | `grid` | `masonry`)

Throws if used outside `LayoutProvider`.

## Responsive rules

- Prefer **CSS** (`HiddenBelow`, Tailwind breakpoints) for responsive visibility.
- **Profile** default shell uses three columns at `lg+`; **about** uses two (main + right); **map** and **waiv-table** use a single column.
- **Layout tokens** (`--shell-header-height`, `--shell-left-width`, `--shell-right-width`, `--shell-bottom-height`) are defined per theme in `theme.css` and mapped in `tailwind.config.js` — see [theme.md](theme.md).

## Adding a new shell or arrangement

1. **Shell** — add a small presentational component under `shared/presentation/layout/shells/`, export from `layout/index.ts`, attach a route group `layout.tsx` if it maps to a URL family.
2. **Arrangement** — add under `arrangements/`, export from the barrel, document in this file.
3. **Tokens** — if new structural sizes are needed, add CSS variables to **every** `[data-theme='…']` block in `theme.css` and extend Tailwind in the same change; update [theme.md](theme.md).

## Tests

Co-located `*.spec.ts` files cover `gridClassForSlots`, `HiddenBelow` classes, `buildCardGridClassName` (see `card-grid-classname.ts`), and `resolveShellMode`. `apps/web/jest.config.cts` extends the Nx preset with a `ts-jest` transform that includes `.tsx` so layout components can be imported in tests.

## Imports

Consume layout from `@/shared/presentation` or `@/shared/presentation/layout` only — **no** deep imports into feature modules for layout primitives.
