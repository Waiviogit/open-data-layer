/**
 * Single place to build fallback canonical URLs (variant B contract).
 * @param baseOrigin - Must be an https origin, e.g. `https://fallback.example.com` (no trailing path slash required).
 */
export function buildFallbackCanonicalUrl(
  objectId: string,
  baseOrigin: string,
): string {
  const base = new URL(baseOrigin);
  if (base.protocol !== 'https:') {
    throw new Error('buildFallbackCanonicalUrl: baseOrigin must use https:');
  }
  const path = `/object/${encodeURIComponent(objectId)}`;
  const out = new URL(path, `${base.origin}/`);
  return out.toString();
}
