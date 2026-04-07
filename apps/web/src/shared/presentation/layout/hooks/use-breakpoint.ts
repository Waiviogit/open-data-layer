'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribes to `window.matchMedia(query)`. SSR-safe (initial `false`).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setMatches(m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
