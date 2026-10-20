'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

import { isFullPageObjectPath } from '@/shared/routes/object-page-path';
import { isAccountRootProfilePath } from '@/shared/routes/profile-page-path';

const locationListeners = new Set<() => void>();
let historyPatched = false;

function notifyLocationListeners(): void {
  for (const listener of locationListeners) {
    listener();
  }
}

function patchHistoryOnce(): void {
  if (historyPatched || typeof window === 'undefined') {
    return;
  }
  historyPatched = true;

  const { pushState, replaceState } = window.history;
  window.history.pushState = function pushStatePatched(...args) {
    const result = pushState.apply(this, args);
    notifyLocationListeners();
    return result;
  };
  window.history.replaceState = function replaceStatePatched(...args) {
    const result = replaceState.apply(this, args);
    notifyLocationListeners();
    return result;
  };

  window.addEventListener('popstate', notifyLocationListeners);

  const navigation = (
    window as Window & { navigation?: { addEventListener?: (type: string, fn: () => void) => void } }
  ).navigation;
  navigation?.addEventListener?.('navigate', notifyLocationListeners);
}

function subscribeLocationPathname(onStoreChange: () => void): () => void {
  patchHistoryOnce();
  locationListeners.add(onStoreChange);
  return () => {
    locationListeners.delete(onStoreChange);
  };
}

function getLocationPathname(): string | null {
  return typeof window === 'undefined' ? null : window.location.pathname;
}

function getServerLocationPathname(): string | null {
  return null;
}

/**
 * Soft navigation away from intercepted post URLs can leave `usePathname()` on the post route
 * (`/@account/permlink`) after the address bar already shows `/object/…` or `/@account`.
 * Hide the intercept when either signal is a full-page object route, or when the address bar is
 * an account-root profile. Do not treat Next's pathname as account-root — during intercept it can
 * still report the underlay profile and would hide the overlay on open.
 */
export function shouldDismissPostInterceptOverlay(
  nextPathname: string | null | undefined,
  locationPathname: string | null | undefined,
): boolean {
  return (
    isFullPageObjectPath(nextPathname) ||
    isFullPageObjectPath(locationPathname) ||
    isAccountRootProfilePath(locationPathname)
  );
}

export function useDismissPostInterceptForObjectSurface(): boolean {
  const nextPathname = usePathname();
  const locationPathname = useSyncExternalStore(
    subscribeLocationPathname,
    getLocationPathname,
    getServerLocationPathname,
  );

  return shouldDismissPostInterceptOverlay(nextPathname, locationPathname);
}
