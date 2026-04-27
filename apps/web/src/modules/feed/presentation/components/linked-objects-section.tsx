'use client';

import Image from 'next/image';

import { objectFields } from '../../application/dto/object-fields';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { AVATAR_PLACEHOLDER_SRC, shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';

/** Waivio `objects_core.object_type` for hashtag objects. */
const HASHTAG_OBJECT_TYPE = 'hashtag';

function isHashtagObject(objectType: string | null | undefined): boolean {
  return objectType?.trim().toLowerCase() === HASHTAG_OBJECT_TYPE;
}

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
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${t('feed_linked_object_rating')}: ${label}`}>
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

type LinkedObject = NonNullable<FeedStoryView['objects']>[number];

function SummaryChevron() {
  return (
    <span
      className="inline-flex shrink-0 text-fg-tertiary transition-transform duration-200 group-open:rotate-90"
      aria-hidden
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </span>
  );
}

function LinkedObjectCard({ object: o }: { object: LinkedObject }) {
  const { t } = useI18n();
  const typeLabel = formatLinkedObjectTypeLabel(o.object_type);
  const categoryLabels = objectFields.tagCategoryLabels(o);
  const subtitleParts = [typeLabel, ...categoryLabels.filter(Boolean)].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');
  const avatarUrl = objectFields.image(o);
  const name = objectFields.name(o);
  const description = objectFields.description(o);

  return (
    <li className="relative list-none rounded-card border border-border bg-surface-control/40 p-card-padding shadow-whisper">
      <div className="absolute end-3 top-3">
        <span
          className="inline-flex"
          title={
            o.hasAdministrativeAuthority
              ? t('feed_linked_object_admin_hint')
              : undefined
          }
          aria-label={
            o.hasAdministrativeAuthority ? t('feed_linked_object_admin_hint') : undefined
          }
        >
          <IconHeartAdministrative active={o.hasAdministrativeAuthority ?? false} />
        </span>
      </div>
      <div className="flex gap-3 pe-8">
        <div className="shrink-0">
          <span className="flex size-14 items-center justify-center overflow-hidden rounded-full border border-border bg-surface ring-1 ring-border/60">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                className="size-full object-cover"
                width={56}
                height={56}
                sizes="56px"
                unoptimized={shouldUnoptimizeRemoteImage(avatarUrl)}
              />
            ) : (
              <Image
                src={AVATAR_PLACEHOLDER_SRC}
                alt=""
                className="size-full object-cover"
                width={56}
                height={56}
                sizes="56px"
              />
            )}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-weight-label text-body text-heading">{name ?? o.object_id}</p>
          {subtitle ? (
            <p className="mt-0.5 text-caption text-fg-secondary">{subtitle}</p>
          ) : null}
          <RatingRow rating01To5={objectFields.ratingStars01To5(o)} />
          {description ? (
            <p className="mt-2 text-body-sm italic leading-body text-muted line-clamp-4">{description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function LinkedObjectsSection({ objects }: { objects: NonNullable<FeedStoryView['objects']> }) {
  const { t } = useI18n();
  if (objects.length === 0) {
    return null;
  }

  const linkedObjects = objects.filter((o) => !isHashtagObject(o.object_type));
  const hashtagObjects = objects.filter((o) => isHashtagObject(o.object_type));

  return (
    <section className="mt-8 flex flex-col gap-6 border-t border-border pt-6">
      {linkedObjects.length > 0 ? (
        <details open className="group">
          <summary
            id="post-linked-objects-heading"
            className="flex cursor-pointer list-none items-center gap-1.5 font-label text-body-sm font-medium text-heading tracking-body [&::-webkit-details-marker]:hidden"
          >
            <SummaryChevron />
            <span className="inline-flex items-center gap-2">
              {t('feed_linked_objects')}
              <span className="rounded-pill bg-surface-control px-1.5 py-px text-micro font-medium text-fg-secondary tabular-nums">
                {linkedObjects.length}
              </span>
            </span>
          </summary>
          <ul
            className="mt-4 flex flex-col gap-card-padding"
            aria-labelledby="post-linked-objects-heading"
          >
            {linkedObjects.map((o) => (
              <LinkedObjectCard key={o.object_id} object={o} />
            ))}
          </ul>
        </details>
      ) : null}

      {hashtagObjects.length > 0 ? (
        <details className="group">
          <summary
            id="post-linked-hashtags-heading"
            className="flex cursor-pointer list-none items-center gap-1.5 font-label text-body-sm font-medium text-heading tracking-body [&::-webkit-details-marker]:hidden"
          >
            <SummaryChevron />
            <span className="inline-flex items-center gap-2">
              {t('feed_linked_object_hashtags')}
              <span className="rounded-pill bg-surface-control px-1.5 py-px text-micro font-medium text-fg-secondary tabular-nums">
                {hashtagObjects.length}
              </span>
            </span>
          </summary>
          <ul
            className="mt-4 flex flex-col gap-card-padding"
            aria-labelledby="post-linked-hashtags-heading"
          >
            {hashtagObjects.map((o) => (
              <LinkedObjectCard key={o.object_id} object={o} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
