'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { MapProviderPort } from '../types';
import { leafletMapProvider } from './leaflet';

const MapProviderContext = createContext<MapProviderPort | null>(null);

export type MapProviderProps = {
  children: ReactNode;
  /** Defaults to Leaflet. Swap for another engine that implements {@link MapProviderPort}. */
  impl?: MapProviderPort;
};

export function MapProvider({ children, impl = leafletMapProvider }: MapProviderProps) {
  const value = useMemo(() => impl, [impl]);
  return (
    <MapProviderContext.Provider value={value}>{children}</MapProviderContext.Provider>
  );
}

export function useMapProvider(): MapProviderPort {
  const ctx = useContext(MapProviderContext);
  if (!ctx) {
    throw new Error(
      'Map components require a MapProvider ancestor. Wrap the map subtree with <MapProvider>.',
    );
  }
  return ctx;
}
