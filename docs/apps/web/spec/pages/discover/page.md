---
id: web-pages-discover
title: Discover page
description: Browse objects by type or users with optional text search and tag-category filters (AND semantics).
tags: [web, page, discover]
related:
  - docs/apps/web/spec/pages/index.md
type: spec
status: active
scope: web
updated_at: 2026-09-22
---

# Discover page (`/discover`)

Browse objects by type or users with optional text search and tag-category filters (AND semantics).

Hub chrome: under `(app)/(hub)` with FEED / DISCOVER / MARKET section nav (`AppSectionNav`). DISCOVER is active on this route. See [home](../home/page.md).

## Routes

| URL | Mode |
|-----|------|
| `/discover` (no `type`, no `users`) | Redirects to remembered `discover_object_type` cookie, otherwise `type=product`. Other query params (`q`, `tags`, `sort`, `box`, `map`) are preserved. |
| `/discover?type={object_type}` | Object feed for one registry type |
| `/discover?type=all` | Mixed object-type feed (no `object_type` sent to query-api) |
| `/discover?users=1` | User list (optional `q` prefix search) |
| `q`, `tags`, `sort`, `box`, `map` | Shared query params |

Bare `/discover` always resolves to a type. A valid remembered cookie wins; first-time visitors land on **Product**. The automatic redirect does not write the cookie.

### Map area (`box`)

Geo-capable registry types (`restaurant`, `place`, `business`, `person`, `service`) show a map on desktop (right rail above filters) and a **Map** entry on mobile (fullscreen modal). The URL param is:

`box=swLng,swLat,neLng,neLat` (WGS84; same order as query-api `ST_MakeEnvelope`).

- Applying **Search area** replace-navigates with `box` set; other params (`type`, `q`, `tags`, `sort`) are preserved.
- A removable **Map area** chip clears `box` without opening the map.
- No map on `type=all`, users mode, or non-geo types.
- Object feed and tag-category facets both respect `box` when present.

### Map camera (`map`)

`map=lat,lng,zoom` stores the **map camera only** (WGS84 latitude/longitude plus integer zoom `0–19`). It is **not** sent to query-api — only `box` filters results.

- Written to the URL when opening the fullscreen map or applying **Search area** (replace navigation, `scroll: false`).
- Not updated on every pan/zoom (avoids feed skeleton flicker during navigation).
- Preserved alongside `box`, `tags`, and `sort` when those params change.
- Initial map view order: URL `map` → fit applied `box` → default world view.

### Remembered object type

Cookie `discover_object_type` stores the last picked registry object type (client write on type selection in the desktop sidebar or mobile type sheet; server read on page load). Returning visitors with a valid cookie are redirected to `/discover?type={remembered}`. The cookie is never set for `users` mode, `type=all`, or the automatic Product default.

## Mobile layout (< `lg`)

- **Type button** — accent label (`text-section`) in feed header; opens bottom sheet (`ModalShell variant="sheet"`). Same sections as the desktop sidebar: Popular, Users, All types, each row with the same glyph. Active row uses `bg-accent-soft`. Search filters Popular and All types; Users stays visible. No duplicate "Discover" label on mobile.
- **Filters** — `+ Filter` opens filter bottom sheet (tag categories only; same data as desktop right column). Active chips shown inline; toggles apply immediately via URL replace. No "Filters" section heading.
- **List / Map** — geo types show underline sub-nav (`List` | `Map`) below filters. **List** shows the object feed + `Sort: …` dropdown. **Map** shows inline map (`DiscoverMapPanel variant="feed"`) with Search area, zoom, locate, and expand-to-fullscreen. Expanding opens the fullscreen map modal; **Search area** writes `box` to the URL.
- Desktop three-column layout (sidebar / feed / filters) at `lg+`; sidebar and desktop filter column hidden on mobile. Map rail stacks above the filters column when the type supports geo.

## Desktop sidebar (`lg+`)

Left column, top to bottom:

1. **Find object type** — filters Popular and All types by label. While searching, the 15-item All types cap is skipped and empty type sections hide. Users stays visible. No matches show `discover_no_results`.
2. **Popular** — `product`, `business`, `restaurant`, `person`, `book`.
3. **Users** — All users (above the full type list).
4. **All types** — alphabetical registry list, first 15, then Show more. The column scrolls inside the viewport (`max-h` + `overflow-y-auto`, scrollbar hidden) so the expanded list is reachable without scrolling the feed to its end. A type can appear in both Popular and All types; the active row is accent in both when both are visible. Selecting a Popular type does not expand All types. Selecting a type that exists only in the hidden tail does expand All types.

Each type row and the Users row show a 14px glyph from `@/icons`. The active row uses `bg-accent-soft` (`--color-accent-soft`, 10% accent) with `text-accent`. `bg-accent/10` does not paint because `--color-accent` is a hex CSS variable.

## API (via BFF)

| BFF | query-api |
|-----|-----------|
| `GET /api/discover/objects` | `GET /query/v1/discover/objects` |
| `GET /api/discover/users` | `GET /query/v1/discover/users` |
| `GET /api/discover/tag-categories` | `GET /query/v1/discover/tag-categories` |

### Object feed

- Filters: `object_type`, optional FTS `q`, `tags[]` (each tag = `category:value` encoding, e.g. `Cuisine:asian`; AND across all selected tags; both `value_json.category` and `value_json.value` must match), optional `box` (map bounding box: `swLng,swLat,neLng,neLat`).
- Sort: `rank` (default, `objects_core.weight DESC`), `newest` (`created_at DESC`), `oldest`.
- Cursor: opaque base64 JSON (`created_at`, `weight`, `object_id`, `sort`).
- Cards: projected with shop card update types (`name`, `image`, `description`, `tagCategoryItem`, `aggregateRating`) plus `geo` for map markers.

### User feed (`?users=1`)

- Cursor: opaque base64 JSON (`wobjects_weight`, `name`).
- Sort: `wobjects_weight DESC NULLS LAST`, `name ASC`.
- Row UI (`DiscoverUserFeed`): avatar, username, expertise chip (`wobjects_weight`, 2 decimals) + `·` + plain `followers_count`; `StatHoverTooltip` on expertise and followers (same i18n keys as header search). Optional `search_user_following` label when `is_following`.

### Tag categories sidebar

- Aggregated from `object_updates` where `update_type = tagCategoryItem`, grouped by `value_json.category` / `value_json.value`.
- Optional `q` and `box` narrow facet counts (same geographic predicate as the object feed when `box` is set).
- Redis cache: `query-api:cache:tag-categories:{objectType}` (TTL 300s). Skipped when `q`, active `tags`, or `box` is present.
- Section order follows `supposed_updates` TAG_CATEGORY values in `@opden-data-layer/core` object-type registry.

### Indexes

Migration `00013_discover_indexes`: expression index on tag item `(value, category)`; `(object_type, seq DESC)` on active `objects_core`.

## Search integration

Header search dropdown chips (per `object_type` and Users) link to `/discover` with `q` and `type` / `users=1`. The **All** chip links to `/discover?type=all&q=…`.

**Enter key** (when no highlighted result): navigate to discover with selected type (URL or remembered cookie), exact username profile match, or mixed results (`type=all`).

## Object page tags

On `/object/:object_id`, tag chips in the left rail **Tags** block link to `/discover?type={object_type}&tags={category}:{value}` (e.g. `Cuisine:asian`) where `object_type` is `ObjectPageViewModel.objectTypeKey` (registry key from query-api, e.g. `recipe`). Legacy value-only `tags` in the URL are ignored by query-api.

## Verification

```bash
pnpm nx test query-api --testPathPattern=discover
pnpm nx test web --testPathPattern=discover
pnpm check:web-i18n-utf8
pnpm exec playwright test src/discover-map.spec.ts
```
