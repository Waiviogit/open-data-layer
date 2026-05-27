'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { DiscoverActiveChips } from './discover-active-chips';
import { DiscoverObjectFeed } from './discover-object-feed';
import { DiscoverSortSelect } from './discover-sort-select';
import { DiscoverUserFeed } from './discover-user-feed';

export type DiscoverFeedProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

export function DiscoverFeed({
  usersMode,
  objectType,
  q,
  tags,
  sort,
  viewerUsername,
  onRequireLogin,
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
      <DiscoverActiveChips
        usersMode={usersMode}
        objectType={objectType}
        q={q}
        tags={tags}
        sort={sort}
      />
      {usersMode ? (
        <DiscoverUserFeed q={q} />
      ) : objectType ? (
        <DiscoverObjectFeed
          objectType={objectType}
          q={q}
          tags={tags}
          sort={sort}
          viewerUsername={viewerUsername}
          onRequireLogin={onRequireLogin}
        />
      ) : null}
    </main>
  );
}
