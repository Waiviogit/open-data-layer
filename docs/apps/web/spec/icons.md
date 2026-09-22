---
id: web-icons
title: Icons module
description: Swappable icon adapter for apps/web — lucide-react behind @/icons.
type: spec
status: active
scope: web
tags: [web, icons, ui]
updated_at: 2026-09-22
related:
  - docs/apps/web/spec/images.md
  - apps/web/AGENTS.md
---

# Icons module

**Location:** [`apps/web/src/icons/`](../../../apps/web/src/icons/) — import via **`@/icons`**.

## Purpose

Single source for UI glyphs in `apps/web`. Features must not import `lucide-react` directly or define inline `<svg>` icons (ESLint enforced). The module wraps **lucide-react** with a semantic name registry so the icon set can be swapped or partially overridden.

## Public API

| Export | Use |
|--------|-----|
| `<Icon name="chevron-down" size={16} className="text-fg" />` | Dynamic icon by registry key |
| `ChevronDownIcon`, `CloseIcon`, … | Named components (thin wrappers over `<Icon>`) |
| `ICON_SIZE` | Size tokens: `xs` 12, `sm` 14, `md` 16, `lg` 20, `xl` 24 |
| `IconName` | Union of registry keys |
| `ICON_REGISTRY`, `composeIconRegistry` | Registry introspection / pack composition |

### Accessibility

- Default: decorative — `aria-hidden="true"`, no accessible name.
- When `title` is set: `role="img"` and `<title>` child (use only when the icon alone must be announced).
- Icon-only buttons must keep their **button** accessible name via `aria-label` on the control, not via icon `title`.

### Colors

Icons use **`currentColor`** (via Lucide stroke/fill or custom SVG). Apply semantic classes on the icon or parent: `text-fg`, `text-fg-secondary`, `text-accent`, etc.

**Documented exceptions** (fixed brand colors): `hive-savings-shield`, `hbd-savings-shield`. Brand social icons (`brand-facebook`, `brand-x`) use `currentColor` like other glyphs.

## Architecture

```
@/icons
  icon.tsx          <Icon>
  named.tsx         ChevronDownIcon, …
  registry.ts       composeIconRegistry(lucide, custom)
  packs/lucide/     semantic → lucide glyph (only place for lucide mapping)
  packs/custom/     brand, savings shields, weight scale, dimensions, …
```

Swap entire set: add `packs/heroicons/index.ts` implementing the same keys, change one line in `registry.ts`.

Override one icon: add component under `packs/custom/` and export from `customIconPack` (spread overrides lucide).

## Registry keys (IconName)

Navigation: `chevron-down`, `chevron-right`, `chevron-left`, `close`, `external-link`, `more-horizontal`

Actions: `pencil`, `plus`, `minus`, `pin`, `flag`, `eye-off`, `mute`, `send`, `search`, `filter`

Social: `thumb-up`, `thumb-down`, `comment`, `reblog`, `bell`, `star`, `heart`, `user-plus`, `user-minus`, `user`, `users`

Editor: `bold`, `italic`, `link`, `code`, `table`, `image`, `video`, `emoji`, `play`

Meta / wallet: `clock`, `calendar`, `mail`, `map-pin`, `globe`, `phone`, `dollar`, `zap`, `hash`, `wallet`, `book`, `book-open`, `check-circle`, `arrow-left-right`, `arrow-up-down`, `trending-up`, `lock`, `lock-open`, `info`, `smartphone`, `qr-code`, `maximize`, `minimize`, `locate`, `layout-grid`, `file-text`, `shopping-cart`, `shopping-bag`, `award`

Discover types: `package`, `building`, `utensils`, `utensils-crossed`, `cup-soda`, `share`, `landmark`, `list`, `briefcase`, `puzzle`, `rss`, `store`, `map`, `chef-hat`, `hand-helping`, `hand`, `sparkles`

Custom-only: `brand-facebook`, `brand-x`, `hive-savings-shield`, `hbd-savings-shield`, `wallet-power-lightning`, `reward-flashlight`, `weight-scale`, `dimensions`, `wallet-savings-shield`

## Out of scope (not in @/icons)

| Asset | Reason |
|-------|--------|
| `line-chart-svg.tsx` | Data visualization, gradient + animation |
| `star-rating.tsx` | Half-star clipPath interaction |
| `waivio-map-pin.ts` | Leaflet HTML string |
| Crypto/social logos via `<img>` / `next/image` | Raster or static public SVG URLs |
| Token images (HIVE, HBD, WAIV PNG/SVG) | Brand assets, not UI glyphs |

## Verification

```bash
pnpm nx test web --testPathPatterns=icons
pnpm typecheck:web
pnpm nx lint web
```

Tests: `apps/web/src/icons/*.spec.ts(x)` — registry, a11y, single-source guards, RSC-safe markup.
