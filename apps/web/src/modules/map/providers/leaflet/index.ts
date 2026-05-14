import type { MapProviderPort } from '../../types';
import { LeafletAppMap } from './leaflet-map';
import { LeafletAppMarker } from './leaflet-marker';
import { LeafletAppPopup } from './leaflet-popup';

/** Leaflet + react-leaflet implementation of {@link MapProviderPort}. */
export const leafletMapProvider: MapProviderPort = {
  Map: LeafletAppMap,
  Marker: LeafletAppMarker,
  Popup: LeafletAppPopup,
};

export { LeafletAppMap } from './leaflet-map';
export { LeafletAppMarker } from './leaflet-marker';
export { LeafletAppPopup } from './leaflet-popup';
