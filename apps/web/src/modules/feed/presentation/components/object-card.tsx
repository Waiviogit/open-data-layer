'use client';

import Image from 'next/image';

import type { ProjectedObjectView } from '../../application/dto/object-fields';
import { objectFields } from '../../application/dto/object-fields';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';

const THUMB_SIZE = 80;

function formatLinkedObjectTypeLabel(type: string | null): string {
  if (type == null || type.trim() === '') {
    return '';
  }
  return type
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function IconStar({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
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

function RatingRow({ rating01To5 }: { rating01To5: number | null }) {
  const { t } = useI18n();
  if (rating01To5 == null) {
    return null;
  }
  const fullStars = Math.round(rating01To5);
  const label = rating01To5.toFixed(1);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-caption font-medium text-fg-secondary">{t('feed_linked_object_rating')}</span>
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${t('feed_linked_object_rating')}: ${label}`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <IconStar key={i} filled={i < fullStars} />
        ))}
      </span>
    </div>
  );
}

function IconHeartAdministrative({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className={active ? 'text-accent' : 'text-fg-tertiary'}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export type ObjectCardProps = {
  object: ProjectedObjectView;
};

/**
 * Shop / feed card: rectangular thumbnail, title, type · categories, rating, excerpt, admin heart.
 */
export function ObjectCard({ object: o }: ObjectCardProps) {
  const { t } = useI18n();
  const typeLabel = formatLinkedObjectTypeLabel(o.object_type);
  const categoryLabels = objectFields.tagCategoryLabels(o);
  const subtitleParts = [typeLabel, ...categoryLabels.filter(Boolean)].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');
  const thumbUrl = objectFields.image(o);
  const name = objectFields.name(o);
  const description = objectFields.description(o);

  return (
    <li className="relative list-none rounded-card border border-border bg-surface-control/40 p-card-padding shadow-whisper">
      <div className="absolute end-3 top-3">
        <span
          className="inline-flex"
          title={o.hasAdministrativeAuthority ? t('feed_linked_object_admin_hint') : undefined}
          aria-label={o.hasAdministrativeAuthority ? t('feed_linked_object_admin_hint') : undefined}
        >
          <IconHeartAdministrative active={o.hasAdministrativeAuthority ?? false} />
        </span>
      </div>
      <div className="flex gap-3 pe-8">
        <div className="shrink-0">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-md border border-border bg-surface ring-1 ring-border/60">
            {thumbUrl ? (
              <Image
                src={thumbUrl}
                alt=""
                className="size-full object-cover"
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                sizes="80px"
                unoptimized={shouldUnoptimizeRemoteImage(thumbUrl)}
              />
            ) : (
              <Image
                src={AVATAR_PLACEHOLDER_SRC}
                alt=""
                className="size-full object-cover"
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                sizes="80px"
              />
            )}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-weight-label text-body text-heading">{name ?? o.object_id}</p>
          {subtitle ? <p className="mt-0.5 text-caption text-fg-secondary">{subtitle}</p> : null}
          <RatingRow rating01To5={objectFields.ratingStars01To5(o)} />
          {description ? (
            <p className="mt-2 text-body-sm italic leading-body text-muted line-clamp-4">{description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
