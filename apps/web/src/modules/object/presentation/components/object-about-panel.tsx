'use client';

import Image from 'next/image';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import type { ObjectAboutPanelView } from '../../domain/object-page.types';

export type ObjectAboutPanelProps = {
  panel: ObjectAboutPanelView;
  rating01To5: number | null;
};

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

/** Max characters shown for About description preview in the left column. */
const OBJECT_ABOUT_INTRO_PREVIEW_MAX_CHARS = 250;

function truncateIntroForPreview(text: string): { display: string; isTruncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { display: '', isTruncated: false };
  }
  if (trimmed.length <= OBJECT_ABOUT_INTRO_PREVIEW_MAX_CHARS) {
    return { display: trimmed, isTruncated: false };
  }
  const clipped = trimmed
    .slice(0, OBJECT_ABOUT_INTRO_PREVIEW_MAX_CHARS)
    .trimEnd();
  return { display: `${clipped}...`, isTruncated: true };
}

export function ObjectAboutPanel({ panel, rating01To5 }: ObjectAboutPanelProps) {
  const { t } = useI18n();
  const displayRating =
    rating01To5 != null ? Math.min(5, Math.max(0, rating01To5)) : null;

  const introRaw = panel.introParagraph?.trim() ?? '';
  const intro = introRaw ? truncateIntroForPreview(panel.introParagraph) : null;

  return (
    <div className="flex min-w-0 flex-col gap-card-padding">
      <aside className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
        <p className="font-medium text-fg">{t('object_detail_about_heading')}</p>
        {intro && intro.display ? (
          <p
            className="mt-2 leading-relaxed"
            title={intro.isTruncated ? introRaw : undefined}
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

      {displayRating != null ? (
        <aside className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="font-medium text-fg">{t('object_detail_overall_rating')}</p>
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
            {typeof panel.overallReviewCount === 'number' ? (
              <span className="text-muted">
                ({panel.overallReviewCount})
              </span>
            ) : null}
          </div>
        </aside>
      ) : null}

      {panel.prosTags && panel.prosTags.length > 0 ? (
        <aside className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="font-medium text-fg">{t('object_detail_pros_label')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {panel.prosTags.map((tag) => (
              <span
                key={tag}
                className="rounded-btn bg-surface px-2 py-1 text-caption text-fg"
              >
                {tag}
              </span>
            ))}
          </div>
        </aside>
      ) : null}

      {panel.galleryThumbUrls && panel.galleryThumbUrls.length > 0 ? (
        <aside className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="font-medium text-fg">{t('object_detail_gallery_preview')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {panel.galleryThumbUrls.slice(0, 4).map((src, index) => (
              <div
                key={`${src}-${index}`}
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
      ) : null}

      {panel.hoursLines && panel.hoursLines.length > 0 ? (
        <aside className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="font-medium text-fg">{t('object_detail_hours_heading')}</p>
          <ul className="mt-2 space-y-1">
            {panel.hoursLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
