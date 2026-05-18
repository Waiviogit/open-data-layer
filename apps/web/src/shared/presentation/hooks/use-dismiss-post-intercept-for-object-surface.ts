'use client';

import { usePathname } from 'next/navigation';

import { isFullPageObjectPath } from '@/shared/routes/object-page-path';

/**
 * Soft navigation away from intercepted post URLs can briefly leave `usePathname()` stale while
 * the address bar (`window.location.pathname`) already shows `/object/…`.
 * Prefer hiding the intercept shell whenever either signals a full-page object route.
 *
 * SSR: `window` is undefined — only Next pathname participates.
 */
export function useDismissPostInterceptForObjectSurface(): boolean {
  const nextPathname = usePathname();
  const locationPathname =
    typeof window === 'undefined' ? null : window.location.pathname;

  return (
    isFullPageObjectPath(nextPathname ?? null) ||
    isFullPageObjectPath(locationPathname ?? undefined)
  );
}
