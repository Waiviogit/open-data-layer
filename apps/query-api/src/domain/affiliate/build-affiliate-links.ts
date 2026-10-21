import {
  AFFILIATE_GEO_GLOBAL,
  AFFILIATE_NULL_PRODUCT_IDS,
  COUNTRY_TO_CONTINENT,
} from '@opden-data-layer/core';
import type { AffiliateConfig, AffiliateLink, AffiliateProductId } from './affiliate.types';
import { pickAffiliateCode } from './pick-affiliate-code';

const NULL_PRODUCT_IDS = new Set<string>(AFFILIATE_NULL_PRODUCT_IDS);

function sameConfig(a: AffiliateConfig, b: AffiliateConfig): boolean {
  return a.objectId === b.objectId && a.urlTemplate === b.urlTemplate;
}

function createAffiliateLink(
  template: string,
  productId: string,
  affiliateCode: string,
): string {
  return template
    .split('$product_id')
    .join(productId)
    .split('$affiliate_code')
    .join(affiliateCode)
    .split('$productId')
    .join(productId)
    .split('$affiliateCode')
    .join(affiliateCode);
}

function pickCodes(config: AffiliateConfig): string[] {
  return config.codes.flatMap((entry) => entry.codes);
}

function chooseOneFromSimilar(
  similar: AffiliateConfig[],
  countryCode: string | null,
): AffiliateConfig | undefined {
  if (countryCode) {
    const country = similar.find((el) => el.geoAreas.includes(countryCode));
    if (country) {
      return country;
    }
    const continent = COUNTRY_TO_CONTINENT[countryCode];
    if (continent) {
      const continentObj = similar.find((el) => el.geoAreas.includes(continent));
      if (continentObj) {
        return continentObj;
      }
    }
  }
  return similar.find((el) => el.geoAreas.includes(AFFILIATE_GEO_GLOBAL));
}

function filterByIdType(
  affiliateCodes: AffiliateConfig[],
  countryCode: string | null,
): AffiliateConfig[] {
  const filtered: AffiliateConfig[] = [];
  const alreadyUsed: AffiliateConfig[] = [];

  for (const object of affiliateCodes) {
    if (alreadyUsed.some((el) => sameConfig(el, object))) {
      continue;
    }
    const similar = affiliateCodes.filter((el) =>
      el.productIdTypes.some((t) => object.productIdTypes.includes(t)),
    );
    const chosen = chooseOneFromSimilar(similar, countryCode);
    if (!chosen) {
      continue;
    }
    filtered.push(chosen);
    alreadyUsed.push(...similar);
  }

  return filtered;
}

function makeFromExactMatched(input: {
  affiliateCodes: AffiliateConfig[];
  mappedProductIds: AffiliateProductId[];
  countryCode: string | null;
}): AffiliateLink[] {
  const usedAffiliate: AffiliateConfig[] = [];
  const links: AffiliateLink[] = [];

  for (const el of input.mappedProductIds) {
    const type = el.productIdType.toLowerCase();
    const affiliates = input.affiliateCodes.filter((a) =>
      a.urlTemplate.toLowerCase().includes(type),
    );
    const byCountry = affiliates.find(
      (v) => input.countryCode != null && v.geoAreas.includes(input.countryCode),
    );
    const affiliate = byCountry ?? affiliates[0];
    if (!affiliate) {
      continue;
    }
    if (usedAffiliate.some((used) => sameConfig(used, affiliate))) {
      continue;
    }
    usedAffiliate.push(affiliate);
    const affiliateCode = pickAffiliateCode(pickCodes(affiliate));
    if (!affiliateCode) {
      continue;
    }
    links.push({
      link: createAffiliateLink(affiliate.urlTemplate, el.productId, affiliateCode),
      image: affiliate.button,
      affiliateCode,
      type: el.productIdType,
      objectId: affiliate.objectId,
    });
  }

  return links;
}

export function buildAffiliateLinks(
  configs: AffiliateConfig[],
  productIds: AffiliateProductId[],
  countryCode: string | null,
): AffiliateLink[] {
  const links: AffiliateLink[] = [];
  const usedAffiliate: AffiliateConfig[] = [];
  const mappedProductIds = productIds.filter(
    (el) => el.productId.length > 0 && el.productIdType.length > 0,
  );

  const exactMatched = configs.filter((el) =>
    mappedProductIds.some(
      (p) =>
        el.urlTemplate.toLowerCase().includes(p.productIdType.toLowerCase()) &&
        !NULL_PRODUCT_IDS.has(p.productId),
    ),
  );

  if (exactMatched.length > 0) {
    const ids = mappedProductIds.filter((el) =>
      exactMatched.some(
        (aff) =>
          aff.urlTemplate.toLowerCase().includes(el.productIdType.toLowerCase()) &&
          !NULL_PRODUCT_IDS.has(el.productId),
      ),
    );
    links.push(
      ...makeFromExactMatched({
        affiliateCodes: exactMatched,
        mappedProductIds: ids,
        countryCode,
      }),
    );
    usedAffiliate.push(...exactMatched);
  }

  const nullAffiliate = configs.filter((el) =>
    mappedProductIds.some(
      (p) =>
        el.urlTemplate.toLowerCase().includes(p.productIdType.toLowerCase()) &&
        NULL_PRODUCT_IDS.has(p.productId),
    ),
  );
  let remaining = configs.filter(
    (aff) => !nullAffiliate.some((nullAff) => sameConfig(nullAff, aff)),
  );
  remaining = filterByIdType(remaining, countryCode);

  for (const el of mappedProductIds) {
    const type = el.productIdType.toLowerCase();
    const affiliate = remaining.filter((a) => a.productIdTypes.includes(type));
    if (affiliate.length === 0) {
      continue;
    }
    for (const affiliateCodeEl of affiliate) {
      if (usedAffiliate.some((used) => sameConfig(used, affiliateCodeEl))) {
        continue;
      }
      const similar = usedAffiliate.find((u) =>
        u.productIdTypes.some((t) => affiliateCodeEl.productIdTypes.includes(t)),
      );
      if (similar) {
        continue;
      }
      usedAffiliate.push(affiliateCodeEl);
      const affiliateCode = pickAffiliateCode(pickCodes(affiliateCodeEl));
      if (!affiliateCode) {
        continue;
      }
      links.push({
        link: createAffiliateLink(affiliateCodeEl.urlTemplate, el.productId, affiliateCode),
        image: affiliateCodeEl.button,
        affiliateCode,
        type: el.productIdType,
        objectId: affiliateCodeEl.objectId,
      });
    }
  }

  return links;
}
