---
id: docs-apps-query-api-spec-users-favorites-endpoint
title: User favorites endpoints
description: "Read-path favorites for user profiles: type sidebar and paginated object feed."
type: spec
status: active
scope: query-api
tags: [query-api, users, favorites]
updated_at: 2026-06-17
related:
  - docs/apps/query-api/spec/overview.md
  - docs/apps/web/spec/pages/user-profile/routes/favorites.md
---

# User favorites endpoints

**Back:** [query-api overview](overview.md) · **Affiliate:** [affiliate-links.md](affiliate-links.md)

## Purpose

Expose legacy-equivalent favorites scope for profile `/@:name/favorites`:

- **Favorites** `object_favorite` (not ownership)
- **Post-linked** `post_objects` where `author = :name` and `object_type ∈ FAVORITES_OBJECT_TYPES`
- Exclude `user_shop_deselect` object ids (post-linked branch only)
- Respect `user_metadata.hide_favorite_objects` (hides all post-linked favorites)
- Active objects only (`objects_core.status = 'active'`)

## Endpoints

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/query/v1/users/:name/favorites/types` | `{ types: string[] }` — distinct types, count DESC |
| `GET` | `/query/v1/users/:name/favorites` | `{ items: ProjectedObject[], total, hasMore }` |
| `POST` | `/query/v1/users/:name/favorites/map` | `{ items: ProjectedObject[], hasMore }` — geo bbox filter |

### Body (`POST .../favorites/map`)

| Field | Notes |
|-------|-------|
| `box.topPoint` | `[lng, lat]` north-east corner |
| `box.bottomPoint` | `[lng, lat]` south-west corner |
| `objectTypes` | Optional; subset of `MAP_GEO_OBJECT_TYPES` (default: all 17 map types) |
| `skip` / `limit` | Offset pagination; default limit 10, max 100 |

Additional filters vs list endpoint: `object_type ∈ MAP_GEO_OBJECT_TYPES`, latest `geo` update inside `box` (PostGIS `ST_Intersects`).

Sort: `weight DESC NULLS LAST`, `object_id ASC`.

### Query (`GET .../favorites`)

| Param | Notes |
|-------|-------|
| `objectType` | Optional filter; unknown type → empty page |
| `skip` / `limit` | Offset pagination; default limit 20, max 50 |

Sort: `objects_core.weight DESC NULLS LAST`, `object_id ASC`.

### Headers

Same as other user object lists: `Accept-Language` / `X-Locale`, optional `X-Viewer`, `X-Governance-Object-Id`.

## Web client

`apps/web` module `user-profile`: `fetchFavoritesTypes`, `fetchFavoritesObjects`, `fetchFavoritesMap`; cache tags `userFavoritesTypes`, `userFavorites`, `userFavoritesMap`.

## MCP

- `get_user_favorites_types`
- `get_user_favorites`
- `post_user_favorites_map`
