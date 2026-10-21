import type { AffiliateCodeScope } from '@opden-data-layer/core';

export type { AffiliateCodeScope };

export type AffiliateCodeEntry = {
  scope: AffiliateCodeScope;
  creator: string;
  codes: string[];
};

export type AffiliateConfig = {
  objectId: string;
  button: string;
  urlTemplate: string;
  productIdTypes: string[];
  geoAreas: string[];
  codes: AffiliateCodeEntry[];
};

export type AffiliateLink = {
  link: string;
  image: string;
  affiliateCode: string;
  type: string;
  objectId: string;
};

export type AffiliateProductId = {
  productId: string;
  productIdType: string;
};

/** Shared shape of ProjectedObject and RefSummary for link enrichment. */
export type AffiliateEnrichTarget = {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
  affiliateLinks?: AffiliateLink[];
};

export type AffiliateEnrichContext = {
  countryCode: string | null;
  personalAccount?: string;
  governanceObjectIdFromHeader?: string;
};
