import { buildFallbackCanonicalUrl } from './fallback';
import { extractWebsiteFromPostingJson } from './posting-website';
import { normalizeWebsiteToHttpsUrl } from './normalize-website';
import { isAllowedPublicHttpsUrl } from './ssrf-guard';
import { checkUrlHealth } from './http-health';

export type SiteCanonicalPipelineInput = {
  objectId: string;
  postingJsonMetadata: string | null | undefined;
  /** `https://fallbackhost` origin only */
  fallbackOrigin: string;
};

export type SiteCanonicalPipelineResult = {
  /** Stored `https://...` value for objects_core.canonical */
  canonicalUrl: string;
  usedFallback: boolean;
  /** If health / parse failed, short reason (logs only) */
  detail?: string;
};

/**
 * Full chain: parse website → normalize → SSRF (string) → GET health check →
 * on any failure, {@link buildFallbackCanonicalUrl}.
 */
export async function runSiteCanonicalPipeline(
  input: SiteCanonicalPipelineInput,
  options?: { fetchFn?: typeof fetch; healthTimeoutMs?: number },
): Promise<SiteCanonicalPipelineResult> {
  const raw = extractWebsiteFromPostingJson(input.postingJsonMetadata);
  if (raw == null) {
    return {
      canonicalUrl: buildFallbackCanonicalUrl(
        input.objectId,
        input.fallbackOrigin,
      ),
      usedFallback: true,
      detail: 'no_website',
    };
  }
  const normalized = normalizeWebsiteToHttpsUrl(raw);
  if (normalized == null) {
    return {
      canonicalUrl: buildFallbackCanonicalUrl(
        input.objectId,
        input.fallbackOrigin,
      ),
      usedFallback: true,
      detail: 'normalize_failed',
    };
  }
  const u = new URL(normalized);
  const g = isAllowedPublicHttpsUrl(u);
  if (!g.ok) {
    return {
      canonicalUrl: buildFallbackCanonicalUrl(
        input.objectId,
        input.fallbackOrigin,
      ),
      usedFallback: true,
      detail: g.reason,
    };
  }
  const h = await checkUrlHealth(normalized, {
    fetchFn: options?.fetchFn,
    timeoutMs: options?.healthTimeoutMs,
  });
  if (h.ok === false) {
    return {
      canonicalUrl: buildFallbackCanonicalUrl(
        input.objectId,
        input.fallbackOrigin,
      ),
      usedFallback: true,
      detail: h.reason,
    };
  }
  return {
    canonicalUrl: h.finalUrl,
    usedFallback: false,
  };
}
