'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { SearchCountsResponse, SearchResponse } from '../../domain/search-response.schema';
import type { SearchFilterTab, SearchFlatEntry } from '../../domain/search-nav-list';
import {
  buildDiscoverHrefFromSearch,
  HEADER_SEARCH_ALL_TAB,
  formatObjectTypeLabel,
} from '../../domain/search-nav-list';

const TAB_SKELETON_WIDTHS = [56, 72, 64] as const;

const EMPTY_RESULTS: SearchResponse = { objects: [], users: [] };

export type SearchDropdownProps = {
  results: SearchResponse;
  resultsLoading: boolean;
  counts: SearchCountsResponse | null;
  countsLoading: boolean;
  filterTab: SearchFilterTab;
  onFilterTabChange: (tab: SearchFilterTab) => void;
  activeIndex: number;
  flatList: SearchFlatEntry[];
  onHighlightIndex: (index: number) => void;
  listId: string;
  searchQuery: string;
  messages: {
    sectionObjects: string;
    sectionUsers: string;
    empty: string;
    loading: string;
    tabUsers: string;
    tabAll: string;
    following: string;
  };
  onClose: () => void;
};

function pickFlatIndexForRow(
  flatList: SearchFlatEntry[],
  kind: 'object' | 'user',
  key: string,
): number {
  return flatList.findIndex((e) =>
    kind === 'object'
      ? e.kind === 'object' && e.item.object_id === key
      : e.kind === 'user' && e.item.name === key,
  );
}

function tabPillClass(selected: boolean): string {
  return [
    'rounded-full border px-2.5 py-1 text-caption transition-colors',
    selected
      ? 'border-accent bg-accent/10 text-fg'
      : 'border-transparent bg-surface-control text-fg-secondary hover:bg-ghost-surface',
  ].join(' ');
}

function TabCountSuffix({ loading, value }: { loading: boolean; value: number }) {
  if (loading) {
    return (
      <span
        className="ms-0.5 inline-block h-3 w-7 align-middle rounded-sm bg-surface-control animate-pulse"
        aria-hidden
      />
    );
  }
  return <span className="tabular-nums"> ({value})</span>;
}

function TypeTabSkeletons() {
  return TAB_SKELETON_WIDTHS.map((w) => (
    <span
      key={w}
      className="h-7 shrink-0 rounded-full bg-surface-control animate-pulse"
      style={{ width: w }}
      aria-hidden
    />
  ));
}

export function SearchDropdown({
  results,
  resultsLoading,
  counts,
  countsLoading,
  filterTab,
  onFilterTabChange,
  activeIndex,
  flatList,
  onHighlightIndex,
  listId,
  messages,
  onClose,
  searchQuery,
}: SearchDropdownProps) {
  const router = useRouter();

  const hasGlobalCounts = counts !== null;
  const countsPending = countsLoading && !hasGlobalCounts;

  const objectTypes = hasGlobalCounts
    ? Object.keys(counts.type_counts).sort((a, b) => a.localeCompare(b))
    : [...new Set(results.objects.map((o) => o.object_type))].sort((a, b) => a.localeCompare(b));

  const usersTabCount = hasGlobalCounts ? counts.total_users : results.users.length;

  const allTabCount = hasGlobalCounts
    ? Object.values(counts.type_counts).reduce((sum, n) => sum + n, 0)
    : results.objects.length;

  function navigateEntry(entry: SearchFlatEntry) {
    onClose();
    if (entry.kind === 'object') {
      router.push(`/object/${encodeURIComponent(entry.item.object_id)}`);
    } else {
      router.push(`/@${encodeURIComponent(entry.item.name)}`);
    }
  }

  const hasResults =
    results.objects.length > 0 || results.users.length > 0;
  const showResultsBody = !resultsLoading || hasResults;

  const visibleObjects = filterTab === 'users' ? [] : results.objects;

  const visibleUsers = results.users;

  const showObjectsSection =
    showResultsBody && filterTab !== 'users' && visibleObjects.length > 0;
  const showUsersSection = showResultsBody && visibleUsers.length > 0;

  const isEmpty =
    !resultsLoading &&
    (filterTab === 'users'
      ? results.users.length === 0
      : visibleObjects.length === 0 && results.users.length === 0);

  return (
    <div className="grid max-h-[min(70vh,28rem)] grid-rows-[auto_minmax(0,1fr)]">
      <div
        className="shrink-0 border-b border-border bg-surface px-2 py-2"
        role="tablist"
        aria-label={messages.tabUsers}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {countsPending ? (
            <TypeTabSkeletons />
          ) : (
            <>
              <Link
                href={buildDiscoverHrefFromSearch(HEADER_SEARCH_ALL_TAB, searchQuery)}
                role="tab"
                aria-selected={filterTab === HEADER_SEARCH_ALL_TAB}
                className={tabPillClass(filterTab === HEADER_SEARCH_ALL_TAB)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onClose()}
              >
                {messages.tabAll}
                <TabCountSuffix loading={countsPending} value={allTabCount} />
              </Link>
              {objectTypes.map((ot) => (
              <Link
                key={ot}
                href={buildDiscoverHrefFromSearch(ot, searchQuery)}
                role="tab"
                aria-selected={filterTab === ot}
                className={tabPillClass(filterTab === ot)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onClose()}
              >
                {formatObjectTypeLabel(ot)}
                <TabCountSuffix
                  loading={countsPending}
                  value={
                    hasGlobalCounts && counts
                      ? (counts.type_counts[ot] ?? 0)
                      : results.objects.filter((o) => o.object_type === ot).length
                  }
                />
              </Link>
            ))}
            </>
          )}

          <Link
            href={buildDiscoverHrefFromSearch('users', searchQuery)}
            role="tab"
            aria-selected={filterTab === 'users'}
            className={tabPillClass(filterTab === 'users')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onClose()}
          >
            {messages.tabUsers}
            <TabCountSuffix loading={countsPending} value={usersTabCount} />
          </Link>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto bg-surface py-1">
        {resultsLoading && !hasResults ? (
          <p className="px-3 py-4 text-body-sm text-fg-secondary">{messages.loading}</p>
        ) : null}

        {!resultsLoading && isEmpty ? (
          <p className="px-3 py-4 text-body-sm text-fg-secondary">{messages.empty}</p>
        ) : null}

        {showObjectsSection && visibleObjects.length > 0 ? (
          <div className="px-2 pt-2">
            <p className="px-1 pb-1 text-caption font-medium uppercase tracking-wide text-fg-tertiary">
              {messages.sectionObjects}
            </p>
            <ul className="divide-y divide-border" role="listbox" id={`${listId}-objects`}>
              {visibleObjects.map((obj) => {
                const flatIdx = pickFlatIndexForRow(flatList, 'object', obj.object_id);
                const active = flatIdx >= 0 && flatIdx === activeIndex;
                const title = obj.name?.trim() || obj.object_id;
                return (
                  <li key={obj.object_id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        'flex w-full items-center gap-2 px-2 py-2 text-start',
                        active ? 'bg-ghost-surface' : 'hover:bg-ghost-surface',
                      ].join(' ')}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => {
                        if (flatIdx >= 0) {
                          onHighlightIndex(flatIdx);
                        }
                      }}
                      onClick={() => {
                        const entry = flatList[flatIdx];
                        if (entry?.kind === 'object') {
                          navigateEntry(entry);
                        }
                      }}
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-control">
                        {obj.image_url ? (
                          <img
                            src={obj.image_url}
                            alt=""
                            className="h-10 w-10 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-caption text-fg-tertiary">
                            —
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-fg">{title}</span>
                        {obj.parent_name ? (
                          <span className="block truncate text-body-sm text-fg-secondary">
                            {obj.parent_name}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 rounded-sm bg-surface-control px-1.5 py-0.5 text-caption text-fg-secondary">
                        {formatObjectTypeLabel(obj.object_type)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {showUsersSection && visibleUsers.length > 0 ? (
          <div className="px-2 pt-2">
            <p className="px-1 pb-1 text-caption font-medium uppercase tracking-wide text-fg-tertiary">
              {messages.sectionUsers}
            </p>
            <ul className="divide-y divide-border" role="listbox" id={`${listId}-users`}>
              {visibleUsers.map((u) => {
                const flatIdx = pickFlatIndexForRow(flatList, 'user', u.name);
                const active = flatIdx >= 0 && flatIdx === activeIndex;
                return (
                  <li key={u.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        'flex w-full items-center gap-2 px-2 py-2 text-start',
                        active ? 'bg-ghost-surface' : 'hover:bg-ghost-surface',
                      ].join(' ')}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => {
                        if (flatIdx >= 0) {
                          onHighlightIndex(flatIdx);
                        }
                      }}
                      onClick={() => {
                        const entry = flatList[flatIdx];
                        if (entry?.kind === 'user') {
                          navigateEntry(entry);
                        }
                      }}
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-control">
                        {u.profile_image ? (
                          <img
                            src={u.profile_image}
                            alt=""
                            className="h-10 w-10 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-caption text-fg-tertiary">
                            —
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-fg">{u.name}</span>
                          <span className="rounded border border-border px-1.5 py-0.5 text-caption text-fg-secondary">
                            {u.reputation.toFixed(2)} · {u.followers_count}
                          </span>
                        </span>
                      </span>
                      {u.is_following ? (
                        <span className="shrink-0 rounded-sm bg-surface-control px-1.5 py-0.5 text-caption text-fg-secondary">
                          {messages.following}
                        </span>
                      ) : (
                        <span className="shrink-0 w-16" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { EMPTY_RESULTS };
