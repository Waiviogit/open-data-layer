import { AFFILIATE_CODE_SCOPES } from '../../../libs/core/src/constants/affiliate.constants';

/**
 * True when a legacy affiliateCode body is not a PERSONAL/GOVERNANCE scoped array.
 * Domain-scoped rows (e.g. `["example.social.gifts","CODE"]`) must not be migrated.
 */
export function shouldSkipLegacyAffiliateCode(rawBody: string): boolean {
  const trimmed = rawBody?.trim() ?? '';
  if (!trimmed) {
    return true;
  }
  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      const nested = parsed.trim();
      if (
        (nested.startsWith('{') && nested.endsWith('}')) ||
        (nested.startsWith('[') && nested.endsWith(']'))
      ) {
        try {
          parsed = JSON.parse(nested);
        } catch {
          return true;
        }
      }
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return true;
    }
    const scope = parsed[0];
    return typeof scope !== 'string' || !AFFILIATE_CODE_SCOPES.includes(scope as (typeof AFFILIATE_CODE_SCOPES)[number]);
  } catch {
    return true;
  }
}
