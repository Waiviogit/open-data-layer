---
id: web-pages-user-profile-routes-map
title: User profile — map
description: "Map view for a user profile at `/@:name/map`. Full-width center column (no sidebars)."
type: spec
status: active
scope: web
tags: [web, page, user-profile, maps]
updated_at: 2026-06-17
related:
  - docs/apps/web/spec/pages/user-profile/profile-shell.md
  - docs/apps/web/spec/maps.md
  - docs/apps/query-api/spec/users-favorites-endpoint.md
---

# User profile — map

**Back:** [profile shell](../profile-shell.md) · **Related:** [maps.md](../../../maps.md)

## Purpose

Legacy-equivalent favorites map at `/@:name/map`: geo-filtered favorites in the current viewport, object list on the left (~38% desktop, `max-w-xl`), map on the right. Uses `POST .../favorites/map` (same scope as favorites feed).

Sidebar list scrolls independently (`overflow-y-auto`); map height is fixed to the viewport (`h-[calc(100vh-14rem)]`). List cards use `ObjectCard` `layout="mapSidebar"` (compact rating + short description).

## Routes

| Public URL | App Router file |
|------------|-----------------|
| `/@:name/map` | `(profile)/map/page.tsx` |

Layout: [`map/layout.tsx`](../../../../../apps/web/src/app/(app)/user-profile/[name]/(profile)/map/layout.tsx) — single full-width column (no profile sidebars).

## Empty state

When `GET .../favorites/types` has no intersection with `MAP_GEO_OBJECT_TYPES`, show `ProfileMapEmpty` (`profile_map_empty`).

## Components

- `ProfileMapView` — split layout: sidebar list + `AppMap` canvas
- `ProfileMapEmpty` — zero map-eligible favorite types
- List: `ObjectCard` (`layout="mapSidebar"`) + infinite scroll (`loadMoreFavoritesMapAction`)
- Map: Waivio orange pins (`AppMarker` default), marker click opens `AppPopup` with `ObjectCard` (`layout="popup"`), `onViewportChange` debounced marker fetch (`limit: 100`)
- **Reload:** shown when the user pans so the map center moves >20 km from the last list fetch (ignored for the initial `MapFitBounds` after markers load); refetches sidebar list for current bbox

## Cache

Tag `userFavoritesMap`; invalidated in `revalidateUserSocialAfterBroadcast` (heart toggle). **`ProfileMapView` also refetches list + markers client-side** via `onAdministrativeAuthorityChange` on sidebar cards after a successful heart broadcast.

## Errors

Failed map API responses show `profile_map_load_error` in the sidebar (distinct from `favorites_empty`).

## Verification

Manual: `/@:name/map` — pins, sidebar cards, marker popup → object page, pan → Reload → list updates; heart on own favorites refreshes list and markers without manual Reload.
