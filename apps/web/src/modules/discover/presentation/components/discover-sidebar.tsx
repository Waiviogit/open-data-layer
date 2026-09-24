'use client';

import { useMemo, useState } from 'react';

import { ChevronDownIcon, Icon, SearchIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { formatObjectTypeLabel } from '@/modules/app-header/domain/search-nav-list';
import { OptimisticNavLink, useEffectiveNav } from '@/shared/presentation';

import { buildDiscoverHref, parseDiscoverPageState } from '../../domain/discover-url';
import {
  listDiscoverObjectTypes,
  listDiscoverPopularObjectTypes,
  matchesDiscoverTypeSearch,
} from '../../domain/discover-registry';
import {
  DISCOVER_USERS_ICON,
  iconForDiscoverObjectType,
} from '../../domain/discover-type-icons';
import { writeDiscoverObjectTypeCookie } from '../../domain/discover-type-cookie';

const TYPES_INITIAL = 15;

export type DiscoverSidebarProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  sort: 'newest' | 'oldest' | 'rank';
};

function typeLinkClassName(active: boolean): string {
  return [
    'flex w-full items-center gap-2 rounded-btn px-2 py-1.5 text-body-sm transition-colors',
    active
      ? 'bg-accent-soft font-weight-label text-accent'
      : 'text-fg-secondary hover:bg-ghost-surface hover:text-fg',
  ].join(' ');
}

function DiscoverTypeNavLink({
  type,
  q,
  sort,
  active,
}: {
  type: string;
  q: string;
  sort: 'newest' | 'oldest' | 'rank';
  active: boolean;
}) {
  return (
    <OptimisticNavLink
      href={buildDiscoverHref({ type, q, sort })}
      method="replace"
      suppressHydrationWarning
      className={typeLinkClassName(active)}
      aria-current={active ? 'page' : undefined}
      onClick={() => writeDiscoverObjectTypeCookie(type)}
    >
      <Icon name={iconForDiscoverObjectType(type)} size="sm" className="shrink-0" />
      {formatObjectTypeLabel(type)}
    </OptimisticNavLink>
  );
}

export function DiscoverSidebar(_props: DiscoverSidebarProps) {
  const { t } = useI18n();
  const effectiveNav = useEffectiveNav();
  const { usersMode, objectType, q, sort } = useMemo(
    () => parseDiscoverPageState(new URLSearchParams(effectiveNav.search)),
    [effectiveNav.search],
  );

  const types = useMemo(() => listDiscoverObjectTypes(), []);
  const popularTypes = useMemo(() => listDiscoverPopularObjectTypes(), []);
  const popularSet = useMemo(() => new Set(popularTypes), [popularTypes]);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hasSearch = searchQuery.trim().length > 0;
  const filteredPopular = useMemo(
    () => popularTypes.filter((type) => matchesDiscoverTypeSearch(type, searchQuery)),
    [popularTypes, searchQuery],
  );
  const filteredAll = useMemo(
    () => types.filter((type) => matchesDiscoverTypeSearch(type, searchQuery)),
    [types, searchQuery],
  );

  const activeIndex =
    !usersMode && objectType ? types.indexOf(objectType) : -1;
  const activeInPopular = objectType != null && popularSet.has(objectType);
  const activeBeyondInitial = activeIndex >= TYPES_INITIAL && !activeInPopular;

  const visibleAllTypes = useMemo(() => {
    if (hasSearch || showAllTypes || activeBeyondInitial) {
      return filteredAll;
    }
    return filteredAll.slice(0, TYPES_INITIAL);
  }, [filteredAll, hasSearch, showAllTypes, activeBeyondInitial]);

  const hiddenCount = hasSearch ? 0 : Math.max(0, filteredAll.length - TYPES_INITIAL);
  const showMoreButton =
    hiddenCount > 0 && !showAllTypes && !activeBeyondInitial && !hasSearch;

  const showPopular = filteredPopular.length > 0;
  const showAllTypesSection = visibleAllTypes.length > 0;
  const showNoResults = hasSearch && !showPopular && !showAllTypesSection;

  return (
    <aside className="scrollbar-hide hidden min-w-0 self-start space-y-6 lg:sticky lg:top-[calc(var(--app-header-height,4rem)+1rem)] lg:block lg:max-h-[calc(100dvh-var(--app-header-height,4rem)-2rem)] lg:overflow-y-auto lg:overflow-x-hidden">
      <div className="relative flex items-center gap-2 rounded-btn border border-border bg-surface-control px-2 py-1.5">
        <SearchIcon size={16} className="shrink-0 text-fg-secondary" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('discover_find_object_type')}
          aria-label={t('discover_find_object_type')}
          className="min-w-0 flex-1 border-0 bg-transparent text-body-sm text-fg outline-none placeholder:text-fg-tertiary"
        />
      </div>

      {showPopular ? (
        <section>
          <h2 className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
            {t('object_create_group_popular')}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {filteredPopular.map((type) => (
              <li key={`popular-${type}`}>
                <DiscoverTypeNavLink
                  type={type}
                  q={q}
                  sort={sort}
                  active={!usersMode && objectType === type}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
          {t('discover_users_menu')}
        </h2>
        <ul>
          <li>
            <OptimisticNavLink
              href={buildDiscoverHref({ users: true, q, sort })}
              method="replace"
              suppressHydrationWarning
              className={typeLinkClassName(usersMode)}
              aria-current={usersMode ? 'page' : undefined}
            >
              <Icon name={DISCOVER_USERS_ICON} size="sm" className="shrink-0" />
              {t('discover_all_users')}
            </OptimisticNavLink>
          </li>
        </ul>
      </section>

      {showAllTypesSection ? (
        <section>
          <h2 className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
            {t('discover_all_types_menu')}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {visibleAllTypes.map((type) => (
              <li key={`all-${type}`}>
                <DiscoverTypeNavLink
                  type={type}
                  q={q}
                  sort={sort}
                  active={!usersMode && objectType === type}
                />
              </li>
            ))}
          </ul>
          {showMoreButton ? (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 px-2 text-caption text-accent underline-offset-2 hover:underline"
              onClick={() => setShowAllTypes(true)}
            >
              {t('discover_show_more')} ({hiddenCount})
              <ChevronDownIcon size="sm" />
            </button>
          ) : null}
        </section>
      ) : null}

      {showNoResults ? (
        <p className="px-2 text-body-sm text-fg-secondary">{t('discover_no_results')}</p>
      ) : null}
    </aside>
  );
}
