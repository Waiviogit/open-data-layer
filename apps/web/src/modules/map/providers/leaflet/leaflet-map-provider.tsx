'use client';

import type { ComponentType, ReactElement } from 'react';

import type {
  AppMapProps,
  AppMarkerProps,
  AppPopupProps,
  MapProviderPort,
} from '../../types';

/**
 * Leaflet touches `window` at module load. Defer `require` until a map component
 * actually renders (client-only path — {@link AppMap} uses `dynamic(..., { ssr: false })`).
 */
function leafletLazy<P extends object>(
  load: () => ComponentType<P>,
): ComponentType<P> {
  let Cached: ComponentType<P> | undefined;
  return function LeafletEngineLazy(props: P): ReactElement {
    if (!Cached) {
      Cached = load();
    }
    return <Cached {...props} />;
  };
}

export const leafletMapProvider: MapProviderPort = {
  Map: leafletLazy<AppMapProps>(() => {
    return require('./leaflet-map').LeafletAppMap as ComponentType<AppMapProps>;
  }),
  Marker: leafletLazy<AppMarkerProps>(() => {
    return require('./leaflet-marker').LeafletAppMarker as ComponentType<AppMarkerProps>;
  }),
  Popup: leafletLazy<AppPopupProps>(() => {
    return require('./leaflet-popup').LeafletAppPopup as ComponentType<AppPopupProps>;
  }),
};
