/**
 * Client-side pathname for the object detail route.
 * Must stay aligned with `@opden-data-layer/site-canonical` `buildFallbackCanonicalUrl`
 * (`/object/${encodeURIComponent(objectId)}`).
 */
export function objectPagePath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}`;
}

/** True when the browser is showing a full-page object detail route (`/object/…`). */
export function isFullPageObjectPath(pathname: string | null | undefined): boolean {
  if (pathname == null || pathname === '') {
    return false;
  }
  return pathname === '/object' || pathname.startsWith('/object/');
}
