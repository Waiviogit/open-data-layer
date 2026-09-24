'use client';

import { useLayoutEffect } from 'react';

import { isScrollRestorePending, scrollToTopNow } from './scroll-memory';

/**
 * Scroll the window to the top in the same commit as a fresh detail route.
 * Key by the entity id so in-page tab changes do not reset.
 * A pending history restore (back to this page) is left alone.
 */
export function ScrollToTopOnEnter({ routeKey }: { routeKey: string }) {
  useLayoutEffect(() => {
    if (isScrollRestorePending()) {
      return;
    }
    scrollToTopNow();
  }, [routeKey]);

  return null;
}
