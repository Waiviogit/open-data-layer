'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import type { MapPosition } from '../../types';

function samePosition(a: MapPosition, b: MapPosition): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Pans the map when `center` changes (e.g. coordinate inputs). */
export function LeafletMapCenterSync({ center }: { center: MapPosition }) {
  const map = useMap();
  const prevCenter = useRef<MapPosition | null>(null);

  useEffect(() => {
    if (prevCenter.current && samePosition(prevCenter.current, center)) {
      return;
    }
    const animate = prevCenter.current !== null;
    prevCenter.current = center;
    map.setView([center[0], center[1]], map.getZoom(), { animate });
  }, [center, map]);

  return null;
}
