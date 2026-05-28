'use client';

import { useLoginModal } from '@/modules/auth';

import type { DiscoverPageState } from '../../domain/discover-url';
import { objectTypeHasTagCategoryFilters } from '../../domain/discover-registry';
import { DiscoverFeed } from './discover-feed';
import { DiscoverFilters } from './discover-filters';
import { DiscoverSidebar } from './discover-sidebar';

export type DiscoverPageClientProps = DiscoverPageState & {
  viewerUsername?: string | null;
};

export function DiscoverPageClient({
  usersMode,
  objectType,
  q,
  tags,
  sort,
  viewerUsername = null,
}: DiscoverPageClientProps) {
  const { openLogin } = useLoginModal();

  const showFilters =
    !usersMode && objectType != null && objectTypeHasTagCategoryFilters(objectType);

  return (
    <div className="mx-auto w-full max-w-container-page px-gutter sm:px-gutter-sm">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)_minmax(12rem,15rem)]">
        <DiscoverSidebar usersMode={usersMode} objectType={objectType} q={q} sort={sort} />
        <div className="relative z-10 min-w-0">
          <DiscoverFeed
            usersMode={usersMode}
            objectType={objectType}
            q={q}
            tags={tags}
            sort={sort}
            viewerUsername={viewerUsername}
            onRequireLogin={openLogin}
          />
        </div>
        {showFilters && objectType ? (
          <DiscoverFilters objectType={objectType} q={q} tags={tags} sort={sort} />
        ) : (
          <div className="hidden min-w-0 self-start lg:block" aria-hidden />
        )}
      </div>
    </div>
  );
}
