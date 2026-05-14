'use client';

import { useMapProvider } from '../providers/map-provider.context';
import type { AppMapProps } from '../types';

export function AppMapImpl(props: AppMapProps) {
  const { Map } = useMapProvider();
  return <Map {...props} />;
}
