'use client';

import { useRouter } from 'next/navigation';

import type { SearchResponse } from '../../domain/search-response.schema';
import type { SearchFilterTab, SearchFlatEntry } from '../../domain/search-nav-list';
import { formatObjectTypeLabel } from '../../domain/search-nav-list';

export type SearchDropdownProps = {
  results: SearchResponse;
  filterTab: SearchFilterTab;
  onFilterTabChange: (tab: SearchFilterTab) => void;
  activeIndex: number;
  flatList: SearchFlatEntry[];
  onHighlightIndex: (index: number) => void;
  listId: string;
  messages: {
    sectionObjects: string;
    sectionUsers: string;
    empty: string;
    tabAll: string;
    tabUsers: string;
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

export function SearchDropdown({
  results,
  filterTab,
  onFilterTabChange,
  activeIndex,
  flatList,
  onHighlightIndex,
  listId,
  messages,
  onClose,
}: SearchDropdownProps) {
  const router = useRouter();

  const objectTypes = Object.keys(results.type_counts).sort((a, b) => a.localeCompare(b));

  function navigateEntry(entry: SearchFlatEntry) {
    onClose();
    if (entry.kind === 'object') {
      router.push(`/object/${encodeURIComponent(entry.item.object_id)}`);
    } else {
      router.push(`/@${encodeURIComponent(entry.item.name)}`);
    }
  }

  const showObjectsSection =
    filterTab === 'all' || (filterTab !== 'users' && results.objects.some((o) => o.object_type === filterTab));
  const showUsersSection = filterTab === 'all' || filterTab === 'users';

  const visibleObjects =
    filterTab === 'all' || filterTab === 'users'
      ? filterTab === 'users'
        ? []
        : results.objects
      : results.objects.filter((o) => o.object_type === filterTab);

  const visibleUsers =
    filterTab === 'all' || filterTab === 'users'
      ? filterTab === 'users'
        ? results.users
        : results.users
      : [];

  const totalAll = results.objects.length + results.total_users;

  const isEmpty =
    (filterTab === 'all' && results.objects.length === 0 && results.users.length === 0) ||
    (filterTab === 'users' && results.users.length === 0) ||
    (filterTab !== 'all' && filterTab !== 'users' && visibleObjects.length === 0);

  return (
    <div className="flex max-h-[min(70vh,28rem)] flex-col">
      <div
        className="flex flex-wrap gap-1.5 border-b border-border px-2 py-2"
        role="tablist"
        aria-label={messages.tabAll}
      >
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === 'all'}
          className={[
            'rounded-full border px-2.5 py-1 text-caption transition-colors',
            filterTab === 'all'
              ? 'border-accent bg-accent/10 text-fg'
              : 'border-transparent bg-surface-control text-fg-secondary hover:bg-ghost-surface',
          ].join(' ')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFilterTabChange('all')}
        >
          {messages.tabAll} ({totalAll})
        </button>
        {objectTypes.map((ot) => (
          <button
            key={ot}
            type="button"
            role="tab"
            aria-selected={filterTab === ot}
            className={[
              'rounded-full border px-2.5 py-1 text-caption transition-colors',
              filterTab === ot
                ? 'border-accent bg-accent/10 text-fg'
                : 'border-transparent bg-surface-control text-fg-secondary hover:bg-ghost-surface',
            ].join(' ')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFilterTabChange(ot)}
          >
            {formatObjectTypeLabel(ot)} ({results.type_counts[ot] ?? 0})
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === 'users'}
          className={[
            'rounded-full border px-2.5 py-1 text-caption transition-colors',
            filterTab === 'users'
              ? 'border-accent bg-accent/10 text-fg'
              : 'border-transparent bg-surface-control text-fg-secondary hover:bg-ghost-surface',
          ].join(' ')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFilterTabChange('users')}
        >
          {messages.tabUsers} ({results.total_users})
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {isEmpty ? (
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
