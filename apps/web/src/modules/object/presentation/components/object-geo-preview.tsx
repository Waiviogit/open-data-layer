'use client';

import { AppMap, AppMarker, MapProvider } from '@/modules/map';

import { OBJECT_MAP_PREVIEW_MIN_HEIGHT_PX, OBJECT_MAP_PREVIEW_ZOOM } from '../constants/object-map-preview';

export type ObjectGeoPreviewProps = {
  latitude: number;
  longitude: number;
  /** Accessible label for the marker / region. */
  label: string;
};

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

/** Leaflet-backed preview; must stay client-only (see maps module spec). */
export function ObjectGeoPreview({ latitude, longitude, label }: ObjectGeoPreviewProps) {
  const center = [latitude, longitude] as const;

  return (
    <MapProvider>
      <div>
        <AppMap
          center={center}
          zoom={OBJECT_MAP_PREVIEW_ZOOM}
          showBuiltInAttribution={false}
          className="w-full rounded-btn border border-border"
          style={{ minHeight: OBJECT_MAP_PREVIEW_MIN_HEIGHT_PX, width: '100%' }}
        >
          <AppMarker position={center}>
            <span className="sr-only">{label}</span>
          </AppMarker>
        </AppMap>
        <p className="mt-2 text-center text-caption text-muted">
          <a
            href={OSM_COPYRIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border underline-offset-2 hover:text-fg"
          >
            © OpenStreetMap contributors
          </a>
        </p>
      </div>
    </MapProvider>
  );
}
