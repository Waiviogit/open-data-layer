import type { ComponentType, CSSProperties, ReactNode } from 'react';

/** WGS84 coordinate as latitude, longitude (matches common map SDKs). */
export type MapPosition = readonly [latitude: number, longitude: number];

/** Leaflet zoom control customization (ignored by engines that don't support it yet). */
export type AppMapZoomUi =
  | {
      position: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
      compact?: boolean;
    }
  | false;

export interface AppMapProps {
  center: MapPosition;
  zoom: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /**
   * Leaflet: `undefined` keeps the default top-left zoom control; pass an object to
   * reposition/compact, or `false` to hide +/- entirely.
   */
  zoomUi?: AppMapZoomUi;
  /**
   * Leaflet's default attribution strip (often includes the Leaflet mark and tile HTML).
   * Set `false` to hide it and supply OSM-required credit separately (tile policy).
   * @default true
   */
  showBuiltInAttribution?: boolean;
  /** Raster tile URL template (e.g. `{z}/{x}/{y}`). Defaults to OpenStreetMap when using the Leaflet provider. */
  tileLayerUrl?: string;
  /** HTML attribution fragment for the tile layer (Leaflet provider). */
  tileAttribution?: string;
  /** Leaflet `minZoom` (cannot zoom out further). */
  minZoom?: number;
  /** Leaflet `maxZoom` (cannot zoom in further; OSM raster is typically 19). */
  maxZoom?: number;
  /**
   * Leaflet TileLayer `noWrap`: single horizontal world strip (no repeated globes).
   * @default true
   */
  tileNoWrap?: boolean;
  /**
   * Called when the user clicks the map (Leaflet). Use for coordinate pickers.
   * Position is `[latitude, longitude]`.
   */
  onMapClick?: (position: MapPosition) => void;
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
