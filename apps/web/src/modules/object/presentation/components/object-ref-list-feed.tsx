'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTransition } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import type { ProjectedObjectView } from '@/modules/feed/application/dto/object-fields';
import { ObjectCard } from '@/modules/feed/presentation/components/object-card';
import {
  AVATAR_PLACEHOLDER_SRC,
  shouldUnoptimizeRemoteImage,
  useSyncedPaginatedList,
} from '@/shared/presentation';

import type { ObjectRefCardView } from '../../domain/object-page.types';
import type { ObjectRefRelation } from '../../infrastructure/object-ref-list.client';

export type ObjectRefCardProps = {
  item: ObjectRefCardView;
  href?: string;
};

export function ObjectRefCard({ item, href }: ObjectRefCardProps) {
  const src = item.imageSrc?.trim() ? item.imageSrc : AVATAR_PLACEHOLDER_SRC;
  const card = (
    <div className="flex w-full min-w-0 gap-2 rounded-btn border border-border bg-bg p-2 transition-colors hover:bg-surface">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-btn border border-border">
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          sizes="48px"
          unoptimized={
            src === AVATAR_PLACEHOLDER_SRC ? true : shouldUnoptimizeRemoteImage(src)
          }
        />
      </div>
      <p className="min-w-0 flex-1 self-center truncate text-sm font-medium leading-snug text-fg">
        {item.title}
      </p>
    </div>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block w-full min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      suppressHydrationWarning
    >
      {card}
    </Link>
  );
}

export type ObjectRefListFeedProps = {
  objectId: string;
  relation: ObjectRefRelation;
  initialItems: ProjectedObjectView[];
  initialCursor: string | null;
  initialHasMore: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
  loadMoreAction: (
    objectId: string,
    relation: ObjectRefRelation,
    cursor: string | null,
  ) => Promise<{ items: ProjectedObjectView[]; hasMore: boolean; cursor: string | null }>;
};

export function ObjectRefListFeed({
  objectId,
  relation,
  initialItems,
  initialCursor,
  initialHasMore,
  viewerUsername,
  onRequireLogin,
  loadMoreAction,
}: ObjectRefListFeedProps) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const { items, hasMore, cursor, setItems, setHasMore, setCursor } = useSyncedPaginatedList({
    items: initialItems,
    hasMore: initialHasMore,
    cursor: initialCursor,
  });

  const onLoadMore = () => {
    if (!hasMore || pending) {
      return;
    }
    startTransition(async () => {
      const page = await loadMoreAction(objectId, relation, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      setCursor(page.cursor);
    });
  };

  if (items.length === 0) {
    return (
      <p className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
        {t('object_ref_list_empty')}
      </p>
    );
  }

  return (
    <section>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {items.map((o) => (
          <ObjectCard
            key={o.object_id}
            object={o}
            viewerUsername={viewerUsername}
            onRequireLogin={onRequireLogin}
          />
        ))}
      </ul>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="rounded-btn border border-border bg-surface-control px-4 py-2 text-body-sm font-medium text-fg hover:bg-surface-control-hover disabled:opacity-50"
            disabled={pending}
            onClick={onLoadMore}
          >
            {pending ? t('drafts_loading') : t('object_right_show_more')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
