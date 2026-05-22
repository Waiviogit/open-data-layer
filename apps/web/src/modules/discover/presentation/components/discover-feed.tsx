'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { DiscoverObjectFeed } from './discover-object-feed';
import { DiscoverSortSelect } from './discover-sort-select';
import { DiscoverUserFeed } from './discover-user-feed';

export type DiscoverFeedProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
};

export function DiscoverFeed({
  usersMode,
  objectType,
  q,
  tags,
  sort,
}: DiscoverFeedProps) {
  const { t } = useI18n();

  return (
    <main className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-heading font-weight-label text-fg">{t('discover_page_title')}</h1>
        {!usersMode ? (
          <DiscoverSortSelect
            usersMode={usersMode}
            objectType={objectType}
            q={q}
            tags={tags}
            sort={sort}
          />
        ) : null}
      </div>
      {usersMode ? (
        <DiscoverUserFeed q={q} />
      ) : objectType ? (
        <DiscoverObjectFeed objectType={objectType} q={q} tags={tags} sort={sort} />
      ) : null}
    </main>
  );
}
