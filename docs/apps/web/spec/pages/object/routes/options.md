---
id: web-pages-object-routes-options
title: Object page — variant options (left rail)
description: Color/Size variant selectors in the left rail for product-like object types.
type: spec
status: active
scope: web
tags: [web, page, object, options]
updated_at: 2026-09-23
related:
  - docs/apps/web/spec/pages/object/data-loading.md
  - docs/apps/web/spec/pages/object/page-shell.md
  - docs/apps/query-api/spec/object-options.md
---

# Object page — variant options

**Back:** [data-loading](../data-loading.md) · [page-shell](../page-shell.md) · [query-api object-options](../../../../query-api/spec/object-options.md)

## Purpose

Show aggregated variant selectors (Color, Size, …) in the left rail for `product`, `book`, and `service` when `GET /query/v1/objects/:id/options` returns categories.

## Data

Loaded in parallel with resolve — see [data-loading](../data-loading.md). Mapped to the `options` left-rail block in `projected-object-to-page-model.ts`.

## UI (`ObjectOptionsSection`)

| Behavior | Detail |
| -------- | ------ |
| Block heading | `t('object_field_options')` (not hardcoded English) |
| Category order | **Color** first, then categories with image swatches, then alphabetical |
| Image swatch | Only when `option.image` is set — **not** sibling `imageUrl` alone (Size stays text buttons). **50×50px** square (`rounded-card`, not `rounded-btn`), `object-contain` (legacy `Options.less`) |
| Borders | Swatches: `border-2`. Selected: `border-accent`. Own/compatible: solid `border-fg`. Other variants: dashed `border-fg`. Text buttons stay 1px: accent / solid `border-black` / dashed `border-black` |
| Selection | Current object’s values from API; no fake selection from `values[0]` when the object has no value in that category |
| Navigation | `router.push` to compatible sibling `object_id`; section **remounts** via `key={currentObjectId}` after navigation so selection/borders reset |
| Hover preview | Mouse-over or keyboard focus on an option temporarily updates **gallery avatar** (`imageUrl`, fallback `image`), **price** (`entry.price`), and **category label** (hovered value); clears on leave/blur; click still navigates. Avatar swaps inside the **existing gallery frame** (`object-contain`, locked aspect ratio, carousel controls stay mounted) — no layout shift |
| CDN images | `unoptimized` on swatch `Image` (Amazon CDN often fails Next optimizer) |

## Left rail placement

Product-like types use legacy **navigate cluster** order: gallery → price → options **before** menu. See `object-left-rail-order.ts` and [edit-mode](edit-mode.md).

## Verification

```bash
pnpm nx test web --testPathPatterns=object-options-section
pnpm nx test web --testPathPatterns=object-gallery-carousel
pnpm nx test web --testPathPatterns=object-left-rail-order
```

Manual: open a multi-color skort → switch Color → borders/`aria-pressed` match new object; Merrell-style Size rows stay text-only.

## Related code

| Path | Role |
| ---- | ---- |
| `apps/web/src/modules/object/presentation/components/object-options-section.tsx` | UI |
| `apps/web/src/modules/object/presentation/components/object-options-section.utils.ts` | Pure helpers (sort, nav, borders, image gate) |
| `apps/web/src/modules/object/presentation/components/object-left-rail-panel.tsx` | Renders block + remount key |
| `apps/web/src/modules/object/infrastructure/fetch-object-options.server.ts` | SSR fetch |
