'use client';

import { Marker } from 'react-leaflet';

import type { AppMarkerProps } from '../../types';

export function LeafletAppMarker({ position, children }: AppMarkerProps) {
  return (
    <Marker position={[position[0], position[1]]}>{children}</Marker>
  );
}
