---
id: web-pages-object-routes-updates
title: Object page — updates feed
description: "- **URL:** `/object/[object-id]/updates` (optional query: `sort`, `update_type`, `locale`). The path stays in the address bar; {@link apps/web/src/proxy.ts} rewrites internally to the same page with `?tab=updates`. - **Query tabs:** other primary segments still use `?tab=…` on `/object/[object-id]` when needed. - **App files:** `apps/web/src/app/(app)/object/[object-id]/page.tsx`, `object-page-client.tsx`, `updates/updates-feed.actions.ts`"
tags: [web, page, object, updates]
related:
  - docs/apps/web/spec/pages/object/page-shell.md
type: spec
status: active
scope: web
updated_at: 2026-09-24
---

# Object updates feed page

**Back:** [web overview](../../overview.md)

## Route

- **URL:** `/object/[object-id]/updates` (optional query: `sort`, `update_type`, `locale`). The path stays in the address bar; {@link apps/web/src/proxy.ts} rewrites internally to the same page with `?tab=updates`.
- **Query tabs:** other primary segments still use `?tab=…` on `/object/[object-id]` when needed.
- **App files:** `apps/web/src/app/(app)/object/[object-id]/page.tsx`, `object-page-client.tsx`, `updates/updates-feed.actions.ts`

## Data

- **API:** `GET /query/v1/objects/:objectId/updates` (query-api) via `queryApiFetch` in `modules/object-updates/infrastructure/clients/object-updates.client.ts`.
- **Headers:** `X-Locale`, optional `X-Viewer` (cookie auth).

## UX

- **Filters / sort** on `/object/.../updates` are **URL search params** (`sort`, `update_type`, `locale`).
- **Locale filter:** default option label is **“All locales”** (no `locale` query param). Dropdown options come from **`update_locales`** on object resolve (distinct locales stored on the object), not the web interface locale catalog.
- **Object profile tab “Updates”:** the same feed is shown in the **center column**; filters use **local state** + server actions so the tab does not reset when changing sort (no `router.replace` on the profile URL). A link opens the standalone `/updates` route for bookmarkable filters.
- **Load more:** client accumulates items; server action passes opaque `cursor`.
- **Cards:** avatar, creator, Waivio weight, relative time, update type label, locale badge when the type is localizable (from `UPDATE_REGISTRY`), value (text / map / JSON), approval % and for/against counts. JSON (`value_json`, and `value_geo` on map cards) is shown formatted under the type label. **View JSON** stays collapsed by default only for `image`, `imageBackground`, `imageGalleryItem`, and `geo`. `imageGallery` is text and has no JSON toggle. `image_preview_urls` render as images; YouTube / Vimeo / 3Speak / DTube URLs use the same video poster player as gallery tiles (`GalleryMediaItem`) and play inline on the card. The empty value line is omitted when a media preview is already shown. Logged-in viewers can **Approve** (`update_vote` / `for`) or **Reject** (`against`) via Hive `custom_json` (`buildOdlUpdateVoteOp`); unauthenticated clicks open the login modal. After broadcast, `awaitTrxConfirmation` then `router.refresh()`.
- **`imageGalleryItem` cards:** **Set gallery rank** button opens `GalleryRankModal` (same flow as full-screen gallery viewer). Feed items expose `rank_score` (decisive) and `viewer_rank` when `X-Viewer` is set. See [gallery.md](./gallery.md).
- **Vote counts:** numeric counts beside Approve/Reject are clickable. Desktop hover shows preview usernames (`for_preview_voters` / `against_preview_voters` from the feed). Click opens a combined modal with approve and reject voter lists (`GET .../updates/:updateId/voters`). No vote-percent column in the report.
- **Update detail deep link:** `/object/:id/updates/:updateId` — single `UpdateCard` with Back to `/object/:id/updates`. See [object update detail](../../object-update-detail.md).
- **Maps:** `AppMap` + OSM credit line (see [maps.md](./maps.md)).
- **Object page:** the **Updates** primary tab embeds this feed in the center column (see `ObjectPrimaryContent` + `ObjectPageClient`).

## Registries

- Filter options use `OBJECT_TYPE_REGISTRY[objectTypeKey].supported_updates` and `UPDATE_REGISTRY[..].localizable`.
- Imports use scoped paths `@opden-data-layer/core/object-type-registry` and `@opden-data-layer/core/update-registry` (not the core barrel) to keep client bundles tree-shakeable.

## i18n

- Keys prefixed with `object_updates_*` in `apps/web/src/i18n/locales/*.json`.
