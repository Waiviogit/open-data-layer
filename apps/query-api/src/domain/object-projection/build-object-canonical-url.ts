import { buildFallbackCanonicalUrl } from '@opden-data-layer/site-canonical';

/**
 * SEO canonical: **always** `{base}/object/{objectId}` via {@link buildFallbackCanonicalUrl}.
 * - `viewCanonical` null/empty/invalid non-https → `fallbackOrigin` as base
 * - otherwise `https` URL → use its origin as base (same template)
 */
export function buildObjectCanonicalUrl(
  viewCanonical: string | null | undefined,
  objectId: string,
  fallbackOrigin: string,
): string {
  return buildFallbackCanonicalUrl(
    objectId,
    canonicalTemplateBase(viewCanonical, fallbackOrigin),
  );
}

function canonicalTemplateBase(
  viewCanonical: string | null | undefined,
  fallbackOrigin: string,
): string {
  const s = viewCanonical?.trim();
  if (s) {
    try {
      const u = new URL(s);
      if (u.protocol === 'https:') {
        return s;
      }
    } catch {
      // ignore invalid URL, use fallback
    }
  }
  return fallbackOrigin;
}
