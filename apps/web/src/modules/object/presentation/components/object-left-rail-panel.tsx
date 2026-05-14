'use client';

import Image from 'next/image';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { ObjectLeftRailBlock } from '../../domain/object-page.types';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import { ObjectGeoPreview } from './object-geo-preview';
import { ObjectMenuItemsStatic } from './object-menu-items-static';

export type ObjectLeftRailPanelProps = {
  blocks: ObjectLeftRailBlock[];
};

/** Max characters for description preview card (matches legacy sidebar truncation). */
const OBJECT_LEFT_RAIL_DESCRIPTION_PREVIEW_MAX_CHARS = 250;

function truncateIntroForPreview(text: string): { display: string; isTruncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { display: '', isTruncated: false };
  }
  if (trimmed.length <= OBJECT_LEFT_RAIL_DESCRIPTION_PREVIEW_MAX_CHARS) {
    return { display: trimmed, isTruncated: false };
  }
  const clipped = trimmed
    .slice(0, OBJECT_LEFT_RAIL_DESCRIPTION_PREVIEW_MAX_CHARS)
    .trimEnd();
  return { display: `${clipped}...`, isTruncated: true };
}

function IconStar({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className={filled ? 'text-accent-alt' : 'text-fg-disabled'}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        opacity={filled ? 1 : 0.25}
      />
    </svg>
  );
}

export function ObjectLeftRailPanel({ blocks }: ObjectLeftRailPanelProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      {blocks.map((block, index) => {
        const cardClass =
          'rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted';

        switch (block.kind) {
          case 'menuItems':
            return (
              <aside key={`menu-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3">
                  <ObjectMenuItemsStatic items={block.items} />
                </div>
              </aside>
            );
          case 'description': {
            const intro = truncateIntroForPreview(block.text);
            return (
              <aside key={`desc-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                {intro.display ? (
                  <p
                    className="mt-2 leading-relaxed"
                    title={intro.isTruncated ? block.text.trim() : undefined}
                  >
                    {intro.display}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="mt-3 rounded-btn border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-surface"
                >
                  {t('object_detail_description_button')}
                </button>
              </aside>
            );
          }
          case 'rating': {
            const displayRating = Math.min(5, Math.max(0, block.rating01To5));
            return (
              <aside key={`rating-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-0.5"
                    role="img"
                    aria-label={`${t('object_detail_rating')}: ${displayRating.toFixed(1)}`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <IconStar key={i} filled={i < Math.round(displayRating)} />
                    ))}
                  </span>
                  <span className="tabular-nums">{displayRating.toFixed(1)}</span>
                  {typeof block.reviewCount === 'number' ? (
                    <span className="text-muted">({block.reviewCount})</span>
                  ) : null}
                </div>
              </aside>
            );
          }
          case 'tags':
            return (
              <aside key={`tags-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {block.labels.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-btn bg-surface px-2 py-1 text-caption text-fg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </aside>
            );
          case 'gallery':
            return (
              <aside key={`gallery-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {block.urls.slice(0, 4).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="relative aspect-square overflow-hidden rounded-btn border border-border"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="120px"
                        unoptimized={shouldUnoptimizeRemoteImage(src)}
                      />
                    </div>
                  ))}
                </div>
              </aside>
            );
          case 'price':
            return (
              <aside key={`price-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-muted" aria-hidden>
                    $
                  </span>
                  <span className="font-semibold tabular-nums text-fg">{block.text}</span>
                </div>
              </aside>
            );
          case 'workHours':
            return (
              <aside key={`hours-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <ul className="mt-2 space-y-1">
                  {block.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </aside>
            );
          case 'address':
            return (
              <aside key={`addr-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{block.text}</p>
              </aside>
            );
          case 'geo':
            return (
              <aside key={`geo-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <div className="mt-3 overflow-hidden rounded-btn">
                  <ObjectGeoPreview
                    latitude={block.latitude}
                    longitude={block.longitude}
                    label={block.headingLabel}
                  />
                </div>
              </aside>
            );
          case 'websites':
            return (
              <aside key={`web-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <ul className="mt-2 space-y-2">
                  {block.entries.map((entry) => (
                    <li key={`${entry.link}-${entry.title}`} className="flex items-start gap-2">
                      <img
                        src="/images/icons/link-icon.svg"
                        alt=""
                        width={16}
                        height={16}
                        className="mt-0.5 shrink-0 opacity-80"
                      />
                      <span className="break-all text-fg">{entry.title}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            );
          case 'phones':
            return (
              <aside key={`phones-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <ul className="mt-2 space-y-1 tabular-nums">
                  {block.numbers.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </aside>
            );
          case 'email':
            return (
              <aside key={`email-${index}`} className={cardClass}>
                <p className="font-medium text-fg">{block.headingLabel}</p>
                <p className="mt-2 break-all">{block.address}</p>
              </aside>
            );
          default: {
            const _never: never = block;
            return _never;
          }
        }
      })}
    </div>
  );
}
