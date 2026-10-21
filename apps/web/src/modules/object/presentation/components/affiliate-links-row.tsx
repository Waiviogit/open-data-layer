'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { HydrationSafeAnchor } from '@/shared/presentation/components/hydration-safe-anchor';

import {
  resolveAffiliateLinkVisuals,
  type AffiliateLinkInput,
} from '../../domain/affiliate-link-visual';

export type AffiliateLinksRowProps = {
  links: readonly AffiliateLinkInput[];
};

export function AffiliateLinksRow({ links }: AffiliateLinksRowProps) {
  const { t } = useI18n();
  const items = resolveAffiliateLinkVisuals(links);
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-caption text-fg-secondary">{t('Affiliate_Link')}:</span>
      {items.map((item) => (
        <HydrationSafeAnchor
          key={`${item.href}-${item.imageSrc}`}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.stopPropagation();
          }}
          className="affiliate-merchant-btn"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- merchant SVG / CDN logo, not a content image */}
          <img
            src={item.imageSrc}
            alt=""
            className={
              item.isAmazon
                ? 'h-[42px] w-[98px] object-contain'
                : 'h-[42px] w-auto max-w-[120px] object-contain'
            }
          />
        </HydrationSafeAnchor>
      ))}
    </div>
  );
}
