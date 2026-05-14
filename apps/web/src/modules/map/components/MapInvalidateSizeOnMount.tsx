'use client';

import { useEffect } from 'react';

import { useMap } from 'react-leaflet';

/**
 * Call after mount when the map lives in a container whose size wasn't final yet (e.g. modal).
 * Prevents gray tiles / wrong viewport until Leaflet recomputes layout.
 */
export function MapInvalidateSizeOnMount(): null {
  const map = useMap();

  useEffect(() => {
    const run = (): void => {
      map.invalidateSize({ animate: true });
    };

    run();
    const t1 = window.setTimeout(run, 50);
    const t2 = window.setTimeout(run, 280);
    window.addEventListener('resize', run);
    return (): void => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', run);
    };
  }, [map]);

  return null;
}
