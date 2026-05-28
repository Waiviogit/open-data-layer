'use client';

import { useEffect } from 'react';

/**
 * Prevents the page behind a modal / full-screen overlay from scrolling.
 * Restores prior `body` styles on unmount.
 */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [active]);
}
