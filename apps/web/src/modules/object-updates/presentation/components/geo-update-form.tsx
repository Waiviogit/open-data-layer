'use client';

import {
  AppMap,
  AppMarker,
  MapInvalidateSizeOnMount,
  MapProvider,
  type MapPosition,
} from '@/modules/map';
import { useI18n } from '@/i18n/providers/i18n-provider';
import {
  OBJECT_MAP_PREVIEW_MIN_HEIGHT_PX,
} from '@/modules/object/presentation/constants/object-map-preview';

import {
  GEO_PICKER_DEFAULT_CENTER,
  GEO_PICKER_ZOOM,
  GEO_PICKER_ZOOM_EMPTY,
  geoFormValueFromCoordPair,
  parseGeoCoordPair,
} from '../../application/geo-form-value';
import { geoFormValueFromRaw } from '../../application/update-value-form.utils';

const OBJECT_GEO_ZOOM_UI = {
  position: 'topright' as const,
  compact: true,
};

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export type GeoUpdateFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  hideLegend?: boolean;
};

export function GeoUpdateForm({
  value,
  onChange,
  label,
  hideLegend = false,
}: GeoUpdateFormProps) {
  const { t } = useI18n();
  const geo = geoFormValueFromRaw(value);
  const markerPosition = parseGeoCoordPair(geo);
  const mapCenter: MapPosition = markerPosition ?? GEO_PICKER_DEFAULT_CENTER;
  const mapZoom = markerPosition ? GEO_PICKER_ZOOM : GEO_PICKER_ZOOM_EMPTY;

  function patchCoord(field: 'latitude' | 'longitude', raw: string) {
    onChange({ ...geo, [field]: raw });
  }

  function onMapClick(position: MapPosition) {
    onChange(geoFormValueFromCoordPair(position[0], position[1]));
  }

  return (
    <MapProvider>
      <fieldset className="space-y-3 text-sm">
        {hideLegend ? (
          <legend className="sr-only">{label || 'Map'}</legend>
        ) : (
          <legend className="font-medium text-fg">{label}</legend>
        )}
        <label className="block">
          <span className="text-muted">Latitude</span>
          <input
            type="number"
            step="any"
            className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
            value={geo.latitude}
            onChange={(e) => patchCoord('latitude', e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-muted">Longitude</span>
          <input
            type="number"
            step="any"
            className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
            value={geo.longitude}
            onChange={(e) => patchCoord('longitude', e.target.value)}
          />
        </label>
        <div>
          <p className="mb-2 text-caption text-muted">{t('object_edit_geo_map_hint')}</p>
          <AppMap
            key={markerPosition ? 'picked' : 'empty'}
            center={mapCenter}
            zoom={mapZoom}
            showBuiltInAttribution={false}
            zoomUi={OBJECT_GEO_ZOOM_UI}
            onMapClick={onMapClick}
            className="w-full rounded-btn border border-border"
            style={{
              minHeight: OBJECT_MAP_PREVIEW_MIN_HEIGHT_PX,
              width: '100%',
            }}
          >
            <MapInvalidateSizeOnMount />
            {markerPosition ? (
              <AppMarker position={markerPosition}>
                <span className="sr-only">{label}</span>
              </AppMarker>
            ) : null}
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
      </fieldset>
    </MapProvider>
  );
}
