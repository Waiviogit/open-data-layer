# Object updates feed page

**Back:** [web spec overview](./overview.md)

## Route

- **URL:** `/object/[object-id]/updates` (optional query: `sort`, `update_type`, `locale`). The path stays in the address bar; {@link apps/web/src/proxy.ts} rewrites internally to the same page with `?tab=updates`.
- **Query tabs:** other primary segments still use `?tab=…` on `/object/[object-id]` when needed.
- **App files:** `apps/web/src/app/(app)/object/[object-id]/page.tsx`, `object-page-client.tsx`, `updates/updates-feed.actions.ts`

## Data

- **API:** `GET /query/v1/objects/:objectId/updates` (query-api) via `queryApiFetch` in `modules/object-updates/infrastructure/clients/object-updates.client.ts`.
- **Headers:** `X-Locale`, optional `X-Viewer` (cookie auth).

## UX

- **Filters / sort** on `/object/.../updates` are **URL search params** (`sort`, `update_type`, `locale`).
- **Object profile tab “Updates”:** the same feed is shown in the **center column**; filters use **local state** + server actions so the tab does not reset when changing sort (no `router.replace` on the profile URL). A link opens the standalone `/updates` route for bookmarkable filters.
- **Load more:** client accumulates items; server action passes opaque `cursor`.
- **Cards:** avatar, creator, Waivio weight, relative time, update type label, locale badge when the type is localizable (from `UPDATE_REGISTRY`), value (text / map / JSON), approval % and for/against counts (read-only), viewer vote highlight.
- **Maps:** `AppMap` + OSM credit line (see [maps.md](./maps.md)).
- **Object page:** the **Updates** primary tab embeds this feed in the center column (see `ObjectPrimaryContent` + `ObjectPageClient`).

## Registries

- Filter options use `OBJECT_TYPE_REGISTRY[objectTypeKey].supported_updates` and `UPDATE_REGISTRY[..].localizable`.
- Imports use scoped paths `@opden-data-layer/core/object-type-registry` and `@opden-data-layer/core/update-registry` (not the core barrel) so the web bundle does not pull Nest/HTTP helpers.

## i18n

- Keys prefixed with `object_updates_*` in `apps/web/src/i18n/locales/*.json`.
