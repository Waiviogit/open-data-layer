import type { GeoFormValue } from './update-value-form.utils';

/** Map view before the user picks coordinates (approx. central Europe). */
export const GEO_PICKER_DEFAULT_CENTER = [49.0, 32.0] as const;

export const GEO_PICKER_ZOOM = 14;
export const GEO_PICKER_ZOOM_EMPTY = 5;

/** WGS84 pair when both coordinates parse and are in range; otherwise `null`. */
export function parseGeoCoordPair(geo: GeoFormValue): [number, number] | null {
  const lat = geo.latitude === '' ? Number.NaN : Number(geo.latitude);
  const lon = geo.longitude === '' ? Number.NaN : Number(geo.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }
  return [lat, lon];
}

/** Six decimal places — enough for map picking without noisy input. */
export function formatGeoCoord(n: number): string {
  return String(Math.round(n * 1_000_000) / 1_000_000);
}

export function geoFormValueFromCoordPair(lat: number, lon: number): GeoFormValue {
  return {
    latitude: formatGeoCoord(lat),
    longitude: formatGeoCoord(lon),
  };
}
