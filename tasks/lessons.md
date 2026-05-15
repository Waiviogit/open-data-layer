## Web: client imports and `@/modules/user-social` barrel

**Pattern:** Importing the public `user-social` barrel from a **client** component can pull **server-only** modules (`query-api.client` → `env`) and break the Next.js build.

**Rule:** From client code, import **`SortDropdown`** (and similar pure UI) via **deep path**  
`@/modules/user-social/presentation/components/sort-dropdown` instead of the module barrel.

## Web: `@opden-data-layer/core` barrel in App Router

**Pattern:** Importing `@opden-data-layer/core` in a Server Component can pull **`libs/core` HTTP/Nest** code and fail Turbopack (`class-validator`, etc.).

**Rule:** For **registry-only** data in web, use scoped TS paths added to `apps/web/tsconfig.json` (and `tsconfig.base.json`):  
`@opden-data-layer/core/object-type-registry`, `@opden-data-layer/core/update-registry`, `@opden-data-layer/core/update-types` (constants only — avoids pulling `http`/Nest into client bundles).

## Web: Leaflet must not load on the server at module evaluation

**Pattern:** `MapProvider` defaulted to `leafletMapProvider` built from `leaflet/index.ts` that **statically imported** `leaflet-map.tsx` → the `leaflet` package touches **`window` at import time** → frequent `ReferenceError: window is not defined` in Turbopack/SSR logs when `@/modules/map` is part of the graph (e.g. object updates geo cards).

**Rule:** Build `leafletMapProvider` with **lazy** map/marker/popup components that `require()` Leaflet modules only on **first client render**, not when the provider module loads.

## Web: `@/modules/object-updates` barrel in client components

**Pattern:** The module `index.ts` re-exports `getObjectUpdatesFeedPageQuery` → **`query-api.client`** (`server-only`). Importing `@/modules/object-updates` from a **`'use client'`** file breaks the Next.js build.

**Rule:** From client code, import **`ObjectUpdatesFeed`** from  
`@/modules/object-updates/presentation/components/object-updates-feed` and **`ObjectEmbeddedUpdatesFeedModel`** from  
`@/modules/object-updates/embedded-updates-feed.model`. Keep using the barrel from **Server Components** only (`page.tsx`, server actions).

## query-api: recency cursor + numeric fields from pg

**Pattern:** `created_at_unix` (or offsets) may round-trip through JSON as **strings**. Strict `z.number()` in `decodeUpdatesCursor` fails → cursor is dropped → every “load more” repeats the **first page** → broken global order and “infinite” pagination.

**Rule:** Use **`z.coerce.number().int()`** in cursor payloads; **`Number()` / `Math.trunc`** when encoding and before keyset `WHERE`. If encoding fails, return **`hasMore: false`** so the client stops. Optionally **dedupe by `update_id`** when appending on the client.
