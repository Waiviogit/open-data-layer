'use client';

import { useMapProvider } from '../providers/map-provider.context';
import type { AppMarkerProps } from '../types';

/** Must be rendered inside {@link AppMap}. */
export function AppMarker(props: AppMarkerProps) {
  const { Marker } = useMapProvider();
  return <Marker {...props} />;
}
