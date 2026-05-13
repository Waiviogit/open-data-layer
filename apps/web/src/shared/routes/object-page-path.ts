/**
 * Client-side pathname for the object detail route.
 * Must stay aligned with `@opden-data-layer/site-canonical` `buildFallbackCanonicalUrl`
 * (`/object/${encodeURIComponent(objectId)}`).
 */
export function objectPagePath(objectId: string): string {
  return `/object/${encodeURIComponent(objectId)}`;
}
