import {
  INSTACART_STOREFRONT_URL,
  INSTACART_UTM_CAMPAIGN,
  INSTACART_UTM_CONTENT_PREFIX,
  INSTACART_UTM_MEDIUM,
  INSTACART_UTM_SOURCE,
  INSTACART_UTM_TERM,
} from './instacart.constants';

export function stripQueryParams(url: string): string {
  return url.split('?')[0] ?? url;
}

export function applyInstacartCountryHost(url: string, countryCode: string | null): string {
  if (countryCode === 'CA') {
    return url.replace(/\.com/g, '.ca');
  }
  return url;
}

export function instacartSubId2FromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/\./g, '');
  } catch {
    return origin.replace(/^https?:\/\//, '').split('/')[0]?.replace(/\./g, '') ?? '';
  }
}

export function appendInstacartUtm(
  url: string,
  affiliateCode: string | null,
  fallbackOrigin: string,
): string {
  const code = affiliateCode?.trim();
  if (!code) {
    return url;
  }
  const params = new URLSearchParams({
    utm_campaign: INSTACART_UTM_CAMPAIGN,
    utm_medium: INSTACART_UTM_MEDIUM,
    utm_source: INSTACART_UTM_SOURCE,
    utm_term: INSTACART_UTM_TERM,
    utm_content: `${INSTACART_UTM_CONTENT_PREFIX}${code}`,
    subId1: crypto.randomUUID().replace(/-/g, ''),
    subId2: instacartSubId2FromOrigin(fallbackOrigin),
  });
  return `${url}?${params.toString()}`;
}

export function finalizeInstacartUrl(input: {
  baseUrl: string;
  countryCode: string | null;
  affiliateCode: string | null;
  fallbackOrigin: string;
}): string {
  const stripped = stripQueryParams(input.baseUrl);
  const localized = applyInstacartCountryHost(stripped, input.countryCode);
  return appendInstacartUtm(localized, input.affiliateCode, input.fallbackOrigin);
}

export function instacartStorefrontUrl(countryCode: string | null): string {
  return applyInstacartCountryHost(INSTACART_STOREFRONT_URL, countryCode);
}
