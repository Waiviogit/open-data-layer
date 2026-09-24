'use client';

import { useEffect, useRef } from 'react';

import { useMap } from 'react-leaflet';

import type { MapPosition } from '../types';

const FIT_BOUNDS_PADDING_PX = 48;

function positionsKey(positions: readonly MapPosition[]): string {
  return positions.map(([lat, lng]) => `${lat},${lng}`).join('|');
}

export type MapFitBoundsProps = {
  positions: readonly MapPosition[];
  /** Inset in pixels. Defaults to the shared map padding. */
  paddingPx?: number;
};

/**
 * Re-fits the map viewport when `positions` changes (e.g. destination + user location).
 * Requires at least two positions; no-op otherwise.
 */
export function MapFitBounds({
  positions,
  paddingPx = FIT_BOUNDS_PADDING_PX,
}: MapFitBoundsProps): null {
  const map = useMap();
  const lastFittedKeyRef = useRef('');

  useEffect(() => {
    if (positions.length < 2) {
      return;
    }
    const key = `${paddingPx}:${positionsKey(positions)}`;
    if (key === lastFittedKeyRef.current) {
      return;
    }
    lastFittedKeyRef.current = key;
    const latLngBounds = positions.map(
      ([lat, lng]) => [lat, lng] as [number, number],
    );
    map.fitBounds(latLngBounds, {
      padding: [paddingPx, paddingPx],
    });
  }, [map, paddingPx, positions]);

  return null;
}
