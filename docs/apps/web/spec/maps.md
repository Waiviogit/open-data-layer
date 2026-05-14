# Maps (web)

**Back:** [web overview](overview.md)

## Why this module exists

Geographic maps need a heavy browser-only SDK. Product UIs should depend on **`AppMap`**, **`AppMarker`**, and **`AppPopup`** plus **`MapProvider`**, not on Leaflet or MapLibre directly. That keeps open the option to move from **Leaflet** (raster tiles, simple stacks) to **MapLibre** (vector tiles, custom layers) without rewriting screens.

- **Code:** `apps/web/src/modules/map/`
- **Port:** `MapProviderPort` in `types.ts` — `Map`, `Marker`, `Popup` components sharing `AppMapProps` / `AppMarkerProps` / `AppPopupProps`.

## Default stack

- **Engine:** Leaflet via `react-leaflet` (`leafletMapProvider`).
- **Wrappers:** `AppMap` loads the map with `next/dynamic` and `{ ssr: false }` so Leaflet never runs during SSR.

## Usage

Wrap any subtree that renders maps with **`MapProvider`** (default `impl` is Leaflet). Import UI from the feature barrel:

```tsx
'use client';

import {
  AppMap,
  AppMarker,
  AppPopup,
  MapProvider,
} from '@/modules/map';

export function DemoMap() {
  return (
    <MapProvider>
      <AppMap
        center={[52.52, 13.405] as const}
        zoom={13}
        className="h-96 w-full rounded-md"
      >
        <AppMarker position={[52.52, 13.405] as const}>
          <AppPopup>
            <p className="text-fg p-2 text-sm">Example</p>
          </AppPopup>
        </AppMarker>
      </AppMap>
    </MapProvider>
  );
}
```

Coordinate type is **`MapPosition`**: `readonly [latitude, longitude]`.

### Tile layer (Leaflet)

Optional props on **`AppMap`**:

- `tileLayerUrl` — URL template (e.g. `{z}/{x}/{y}`). Default is OpenStreetMap raster tiles; comply with their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
- `tileAttribution` — HTML attribution string for the tile layer.

### Default marker icons (Leaflet)

Bundlers often break Leaflet’s default marker images. The Leaflet provider sets **icon URLs from `leaflet/dist/images/*`** via `L.Icon.Default.mergeOptions`. If markers still break in a new bundler, verify PNG imports resolve to public URLs and adjust the merge options in `providers/leaflet/leaflet-map.tsx`.

## Swapping the engine

1. Implement **`MapProviderPort`** with your SDK (e.g. MapLibre GL + React wrappers).
2. Pass it to **`<MapProvider impl={myProvider} />`**.
3. Keep props on **`AppMap` / `AppMarker` / `AppPopup`** stable; extend shared types in `types.ts` if new cross-engine props are needed.

**`maplibreMapProviderStub`** throws if mounted; it exists only as a naming/import placeholder until a real MapLibre port is added.

## SSR and Next.js

- Do **not** import `leaflet` or `react-leaflet` in **Server Components**.
- **`AppMap`** is already client-only and dynamically loaded without SSR. **`AppMarker`** / **`AppPopup`** must be **descendants** of **`AppMap`** in the React tree so the underlying map context exists after load.
- Importing **`leaflet/dist/leaflet.css`** happens only inside the Leaflet provider on the client.

## Styling

Use **semantic** Tailwind tokens (`border-border`, `bg-surface-alt`, etc.) for chrome around the map. Map library internals (canvas, tile layers) cannot always be themed; keep chrome consistent with [`theme.md`](theme.md).

## Related

- User profile map route stub: [`pages/user-profile/routes/map/page-spec.md`](pages/user-profile/routes/map/page-spec.md)
