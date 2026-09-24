'use client';

import { useEffect } from 'react';

import {
  beginScrollRestore,
  readSavedScrollY,
  rememberScrollForCurrentEntry,
} from './scroll-memory';

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function isInternalNavigationAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== '_self') {
    return false;
  }
  if (anchor.hasAttribute('download')) {
    return false;
  }
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#')) {
    return false;
  }
  try {
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Saves list scroll on internal link clicks and restores it on back/forward. */
export function ScrollMemoryListener() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || !isInternalNavigationAnchor(anchor)) {
        return;
      }
      rememberScrollForCurrentEntry();
    };

    const onPopState = () => {
      const saved = readSavedScrollY(window.history.state);
      if (saved === null) {
        return;
      }
      beginScrollRestore(saved);
    };

    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.history.scrollRestoration = previousRestoration;
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return null;
}
