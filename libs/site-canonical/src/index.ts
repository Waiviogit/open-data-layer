export { buildFallbackCanonicalUrl } from './lib/fallback';
export { extractWebsiteFromPostingJson } from './lib/posting-website';
export {
  isAllowedPublicHttpsUrl,
  isForbiddenIPv4,
} from './lib/ssrf-guard';
export {
  normalizeWebsiteToHttpsUrl,
  isHostnameSafeAfterRedirect,
} from './lib/normalize-website';
export { checkUrlHealth, type HealthCheckResult } from './lib/http-health';
export {
  runSiteCanonicalPipeline,
  type SiteCanonicalPipelineInput,
  type SiteCanonicalPipelineResult,
} from './lib/pipeline';
