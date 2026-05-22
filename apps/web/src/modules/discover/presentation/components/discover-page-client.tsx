'use client';

import { useSearchParams } from 'next/navigation';

import { parseDiscoverTagsParam } from '../../domain/discover-url';
import { objectTypeHasTagCategoryFilters } from '../../domain/discover-registry';
import { DiscoverFeed } from './discover-feed';
import { DiscoverFilters } from './discover-filters';
import { DiscoverSidebar } from './discover-sidebar';

const DEFAULT_OBJECT_TYPE = 'product';

export function DiscoverPageClient() {
  const searchParams = useSearchParams();
  const usersMode = searchParams.get('users') === '1';
  const objectType = usersMode ? null : (searchParams.get('type')?.trim() || DEFAULT_OBJECT_TYPE);
  const q = searchParams.get('q')?.trim() ?? '';
  const tags = parseDiscoverTagsParam(
    searchParams.getAll('tags').length > 0
      ? searchParams.getAll('tags')
      : searchParams.get('tags') ?? undefined,
  );
  const sortRaw = searchParams.get('sort');
  const sort =
    sortRaw === 'oldest' || sortRaw === 'rank' || sortRaw === 'newest' ? sortRaw : 'newest';

  const showFilters =
    !usersMode && objectType != null && objectTypeHasTagCategoryFilters(objectType);

  return (
    <div className="mx-auto w-full max-w-[var(--layout-max-width)] px-page-x">
      <div className="grid gap-4 lg:grid-cols-[minmax(10rem,12rem)_minmax(0,1fr)_minmax(12rem,15rem)]">
        <DiscoverSidebar usersMode={usersMode} objectType={objectType} q={q} sort={sort} />
        <DiscoverFeed
          usersMode={usersMode}
          objectType={objectType}
          q={q}
          tags={tags}
          sort={sort}
        />
        {showFilters && objectType ? (
          <DiscoverFilters objectType={objectType} q={q} tags={tags} sort={sort} />
        ) : (
          <div className="hidden lg:block" aria-hidden />
        )}
      </div>
    </div>
  );
}
