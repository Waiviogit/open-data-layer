'use client';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import { useI18n } from '@/i18n/providers/i18n-provider';

import { ObjectCard } from './object-card';

/** Waivio `objects_core.object_type` for hashtag objects. */
const HASHTAG_OBJECT_TYPE = 'hashtag';

function isHashtagObject(objectType: string | null | undefined): boolean {
  return objectType?.trim().toLowerCase() === HASHTAG_OBJECT_TYPE;
}

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
              <ObjectCard key={o.object_id} object={o} />
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
              <ObjectCard key={o.object_id} object={o} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
