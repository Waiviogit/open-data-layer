'use client';

import { useMapEvents } from 'react-leaflet';

import type { MapPosition } from '../../types';

export function LeafletMapClickHandler({
  onMapClick,
}: {
  onMapClick: (position: MapPosition) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}
