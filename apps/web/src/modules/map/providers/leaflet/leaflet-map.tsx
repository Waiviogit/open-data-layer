'use client';

import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';

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

export function LeafletAppMap({
  center,
  zoom,
  children,
  className,
  style,
  tileLayerUrl = DEFAULT_TILE_LAYER_URL,
  tileAttribution = DEFAULT_TILE_ATTRIBUTION,
}: AppMapProps) {
  return (
    <MapContainer
      center={[center[0], center[1]]}
      zoom={zoom}
      className={className}
      style={style}
      scrollWheelZoom
    >
      <TileLayer attribution={tileAttribution} url={tileLayerUrl} />
      {children}
    </MapContainer>
  );
}
