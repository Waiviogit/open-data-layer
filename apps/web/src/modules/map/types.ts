import type { ComponentType, CSSProperties, ReactNode } from 'react';

/** WGS84 coordinate as latitude, longitude (matches common map SDKs). */
export type MapPosition = readonly [latitude: number, longitude: number];

export interface AppMapProps {
  center: MapPosition;
  zoom: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Raster tile URL template (e.g. `{z}/{x}/{y}`). Defaults to OpenStreetMap when using the Leaflet provider. */
  tileLayerUrl?: string;
  /** HTML attribution fragment for the tile layer (Leaflet provider). */
  tileAttribution?: string;
}

export interface AppMarkerProps {
  position: MapPosition;
  children?: ReactNode;
}

export interface AppPopupProps {
  children?: ReactNode;
}

/**
 * Adapter surface for map UIs. UI imports `AppMap` / `AppMarker` / `AppPopup` only;
 * concrete engines implement this port (Leaflet now, MapLibre later).
 */
export interface MapProviderPort {
  Map: ComponentType<AppMapProps>;
  Marker: ComponentType<AppMarkerProps>;
  Popup: ComponentType<AppPopupProps>;
}
