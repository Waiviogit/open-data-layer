'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  buildObjectAddOnPath,
  buildObjectRelatedPath,
  buildObjectSimilarPath,
} from '../../domain/object-page-url.constants';
import type { ObjectRefCardView } from '../../domain/object-page.types';
import type { PaginatedUserFollowListView } from '@/modules/user-social/application/dto/user-social.dto';

import { ObjectRefCard } from './object-ref-list-feed';
import { ObjectRightFollowersSection } from './object-right-followers-section';

const RIGHT_RAIL_MAX_ITEMS = 5;

export type ObjectRightSidebarProps = {
  objectId: string;
  related: ObjectRefCardView[];
  similar: ObjectRefCardView[];
  addOn: ObjectRefCardView[];
  relatedHasMore: boolean;
  similarHasMore: boolean;
  addOnHasMore: boolean;
  rightRailFollowersPage: PaginatedUserFollowListView | null;
};

function ObjectRefSection({
  title,
  items,
  hasMore,
  showMoreHref,
}: {
  title: string;
  items: ObjectRefCardView[];
  hasMore: boolean;
  showMoreHref: string;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, RIGHT_RAIL_MAX_ITEMS);

  return (
    <aside className="w-full rounded-card border border-border bg-surface/60 px-3 py-card-padding text-sm text-muted">
      <p className="font-medium text-fg">{title}</p>
      <ul className="mt-3 w-full space-y-2">
        {visible.map((item) => (
          <li key={item.objectId} className="w-full">
            <ObjectRefCard
              item={item}
              href={`/object/${encodeURIComponent(item.objectId)}`}
            />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <Link
          href={showMoreHref}
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          suppressHydrationWarning
        >
          {t('object_right_show_more')}
        </Link>
      ) : null}
    </aside>
  );
}

/** Matches profile `RightSidebar` surface tokens (`rounded-card`, `border-border`, `bg-surface/60`). */
export function ObjectRightSidebar({
  objectId,
  related,
  similar,
  addOn,
  relatedHasMore,
  similarHasMore,
  addOnHasMore,
  rightRailFollowersPage,
}: ObjectRightSidebarProps) {
  const { t } = useI18n();

  return (
    <div className="flex w-full min-w-0 flex-col gap-card-padding">
      <ObjectRefSection
        title={t('object_right_related')}
        items={related}
        hasMore={relatedHasMore}
        showMoreHref={buildObjectRelatedPath(objectId)}
      />
      <ObjectRefSection
        title={t('object_right_similar')}
        items={similar}
        hasMore={similarHasMore}
        showMoreHref={buildObjectSimilarPath(objectId)}
      />
      <ObjectRefSection
        title={t('object_right_add_on')}
        items={addOn}
        hasMore={addOnHasMore}
        showMoreHref={buildObjectAddOnPath(objectId)}
      />
      {rightRailFollowersPage != null ? (
        <ObjectRightFollowersSection objectId={objectId} page={rightRailFollowersPage} />
      ) : null}
    </div>
  );
}
