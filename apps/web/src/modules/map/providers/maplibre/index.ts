import type { ReactElement } from 'react';

import type {
  AppMapProps,
  AppMarkerProps,
  AppPopupProps,
  MapProviderPort,
} from '../../types';

export class MapLibreNotImplementedError extends Error {
  constructor(component: string) {
    super(
      `MapLibre ${component} is not implemented. Use leafletMapProvider with <MapProvider> or implement MapProviderPort with maplibre-gl; see docs/apps/web/spec/maps.md.`,
    );
    this.name = 'MapLibreNotImplementedError';
  }
}

function StubMap(_props: AppMapProps): ReactElement {
  throw new MapLibreNotImplementedError('AppMap');
}

function StubMarker(_props: AppMarkerProps): ReactElement {
  throw new MapLibreNotImplementedError('AppMarker');
}

function StubPopup(_props: AppPopupProps): ReactElement {
  throw new MapLibreNotImplementedError('AppPopup');
}

/**
 * Placeholder port for a future MapLibre implementation. Do not pass to
 * `<MapProvider impl={…} />` until real components exist.
 */
export const maplibreMapProviderStub: MapProviderPort = {
  Map: StubMap,
  Marker: StubMarker,
  Popup: StubPopup,
};
