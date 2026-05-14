'use client';

import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

import '../../map-leaflet-zoom-ui.css';

import type { AppMapProps } from '../../types';

function assetSrc(mod: string | { src: string }): string {
  return typeof mod === 'string' ? mod : mod.src;
}

/** Default markers break under most bundlers unless icon URLs are set explicitly. */
L.Icon.Default.mergeOptions({
  iconUrl: assetSrc(markerIcon),
  iconRetinaUrl: assetSrc(markerIcon2x),
  shadowUrl: assetSrc(markerShadow),
});

const DEFAULT_TILE_LAYER_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const DEFAULT_MAP_MIN_ZOOM = 2;
/** OSM raster max zoom commonly used by Leaflet examples. */
const DEFAULT_MAP_MAX_ZOOM = 19;

export function LeafletAppMap({
  center,
  zoom,
  children,
  className,
  style,
  showBuiltInAttribution = true,
  tileLayerUrl = DEFAULT_TILE_LAYER_URL,
  tileAttribution = DEFAULT_TILE_ATTRIBUTION,
  zoomUi,
  minZoom = DEFAULT_MAP_MIN_ZOOM,
  maxZoom = DEFAULT_MAP_MAX_ZOOM,
  tileNoWrap = true,
}: AppMapProps) {
  const attributionForLayer =
    showBuiltInAttribution === false ? '' : tileAttribution;

  const hideZoom = zoomUi === false;
  const customZoom = typeof zoomUi === 'object' && zoomUi !== null;

  const mapClassNames = [
    className ?? '',
    customZoom && zoomUi.compact ? 'map-zoom-ui-compact' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const useBuiltInCornerZoom = !hideZoom && !customZoom;

  return (
    <MapContainer
      center={[center[0], center[1]]}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      className={mapClassNames.length > 0 ? mapClassNames : undefined}
      style={style}
      scrollWheelZoom
      attributionControl={showBuiltInAttribution !== false}
      zoomControl={useBuiltInCornerZoom}
    >
      <TileLayer
        attribution={attributionForLayer}
        url={tileLayerUrl}
        noWrap={tileNoWrap}
      />
      {customZoom ? <ZoomControl position={zoomUi.position} /> : null}
      {children}
    </MapContainer>
  );
}
