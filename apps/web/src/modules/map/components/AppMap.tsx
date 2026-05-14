'use client';

import dynamic from 'next/dynamic';

import type { AppMapProps } from '../types';

const AppMapImpl = dynamic(
  () => import('./AppMapImpl').then((m) => ({ default: m.AppMapImpl })),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-surface-alt flex min-h-64 w-full items-center justify-center rounded-md border border-border"
        aria-busy="true"
      >
        <span className="sr-only">Loading map</span>
        <span
          className="bg-muted h-2 w-32 animate-pulse rounded-full"
          aria-hidden="true"
        />
      </div>
    ),
  },
);

/**
 * Interactive map root. Loads the engine on the client only (Leaflet is not SSR-safe).
 * Wrap with {@link MapProvider} (default engine: Leaflet).
 */
export function AppMap(props: AppMapProps) {
  return <AppMapImpl {...props} />;
}
