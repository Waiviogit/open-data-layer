import { historyStateWithoutSavedScroll } from './scroll-memory';

/** Update the browser URL immediately without waiting for App Router navigation. */
export function pushInstantUrl(href: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  // The current entry may carry the list's saved offset. The new entry must not.
  window.history.pushState(historyStateWithoutSavedScroll(window.history.state), '', href);
}

/** Replace the browser URL immediately without waiting for App Router navigation. */
export function replaceInstantUrl(href: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.history.replaceState(window.history.state, '', href);
}
