import type { AffiliateLinkView } from '@/modules/feed/application/dto/feed-story.dto';

export const AFFILIATE_MERCHANT_SVG = {
  amazon: '/images/affiliate/amazon-logo.svg',
  walmart: '/images/affiliate/walmart-logo.svg',
  target: '/images/affiliate/target-logo.svg',
} as const;

export type AffiliateMerchantKey = keyof typeof AFFILIATE_MERCHANT_SVG;

export type AffiliateLinkInput = Pick<AffiliateLinkView, 'link' | 'image' | 'type'>;

export type AffiliateLinkVisual = {
  href: string;
  imageSrc: string;
  type: string;
  isAmazon: boolean;
};

const MERCHANT_KEYS = Object.keys(AFFILIATE_MERCHANT_SVG) as AffiliateMerchantKey[];

function isMerchantKey(value: string): value is AffiliateMerchantKey {
  return (MERCHANT_KEYS as readonly string[]).includes(value);
}

function hostMerchant(href: string): AffiliateMerchantKey | null {
  try {
    const host = new URL(href).hostname.toLowerCase();
    if (host.includes('amazon')) {
      return 'amazon';
    }
    if (host.includes('walmart')) {
      return 'walmart';
    }
    if (host.includes('target')) {
      return 'target';
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveAffiliateMerchant(
  type: string,
  href: string,
): AffiliateMerchantKey | null {
  const normalizedType = type.trim().toLowerCase();
  if (isMerchantKey(normalizedType)) {
    return normalizedType;
  }
  return hostMerchant(href);
}

export function resolveAffiliateLinkVisual(
  input: AffiliateLinkInput,
): AffiliateLinkVisual | null {
  const href = input.link.trim();
  if (!href) {
    return null;
  }
  const image = input.image.trim();
  const type = input.type.trim();
  const merchant = resolveAffiliateMerchant(type, href);
  if (image) {
    return {
      href,
      imageSrc: image,
      type,
      isAmazon: merchant === 'amazon',
    };
  }
  if (!merchant) {
    return null;
  }
  return {
    href,
    imageSrc: AFFILIATE_MERCHANT_SVG[merchant],
    type: merchant,
    isAmazon: merchant === 'amazon',
  };
}

export function resolveAffiliateLinkVisuals(
  links: readonly AffiliateLinkInput[],
): AffiliateLinkVisual[] {
  const out: AffiliateLinkVisual[] = [];
  for (const link of links) {
    const visual = resolveAffiliateLinkVisual(link);
    if (visual) {
      out.push(visual);
    }
  }
  return out;
}

export function parseAffiliateLinks(raw: unknown): AffiliateLinkView[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: AffiliateLinkView[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const link = typeof rec.link === 'string' ? rec.link : '';
    const image = typeof rec.image === 'string' ? rec.image : '';
    const type = typeof rec.type === 'string' ? rec.type : '';
    if (!link) {
      continue;
    }
    out.push({
      link,
      image,
      type,
      ...(typeof rec.affiliateCode === 'string' ? { affiliateCode: rec.affiliateCode } : {}),
      ...(typeof rec.objectId === 'string' ? { objectId: rec.objectId } : {}),
    });
  }
  return out;
}

export function affiliateRailItems(
  links: readonly AffiliateLinkInput[] | undefined,
): { href: string; image: string; type: string }[] {
  return resolveAffiliateLinkVisuals(links ?? []).map((item) => ({
    href: item.href,
    image: item.imageSrc,
    type: item.type,
  }));
}
