'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { formatObjectTypeLabel } from '@/modules/app-header/domain/search-nav-list';

import { buildDiscoverHref } from '../../domain/discover-url';
import { listDiscoverObjectTypes } from '../../domain/discover-registry';

const TYPES_INITIAL = 10;

export type DiscoverSidebarProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  sort: 'newest' | 'oldest' | 'rank';
};

export function DiscoverSidebar({
  usersMode,
  objectType,
  q,
  sort,
}: DiscoverSidebarProps) {
  const { t } = useI18n();
  const types = useMemo(() => listDiscoverObjectTypes(), []);
  const [showAllTypes, setShowAllTypes] = useState(false);

  const activeIndex =
    !usersMode && objectType ? types.indexOf(objectType) : -1;
  const activeBeyondInitial = activeIndex >= TYPES_INITIAL;

  const visibleTypes = useMemo(() => {
    if (showAllTypes || activeBeyondInitial) {
      return types;
    }
    return types.slice(0, TYPES_INITIAL);
  }, [types, showAllTypes, activeBeyondInitial]);

  const hiddenCount = Math.max(0, types.length - TYPES_INITIAL);
  const showMoreButton =
    hiddenCount > 0 && !showAllTypes && !activeBeyondInitial;

  return (
    <aside className="min-w-0 self-start space-y-6">
      <section>
        <h2 className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
          {t('discover_objects_menu')}
        </h2>
        <ul className="flex flex-col gap-0.5">
          {visibleTypes.map((type) => {
            const active = !usersMode && objectType === type;
            return (
              <li key={type}>
                <Link
                  href={buildDiscoverHref({ type, q, sort })}
                  suppressHydrationWarning
                  className={[
                    'block rounded-btn px-2 py-1.5 text-body-sm transition-colors',
                    active
                      ? 'bg-accent/15 font-weight-label text-accent'
                      : 'text-fg-secondary hover:bg-ghost-surface hover:text-fg',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  {formatObjectTypeLabel(type)}
                </Link>
              </li>
            );
          })}
        </ul>
        {showMoreButton ? (
          <button
            type="button"
            className="mt-1 px-2 text-caption text-accent underline-offset-2 hover:underline"
            onClick={() => setShowAllTypes(true)}
          >
            {t('discover_show_more')} ({hiddenCount})
          </button>
        ) : null}
      </section>
      <section>
        <h2 className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
          {t('discover_users_menu')}
        </h2>
        <ul>
          <li>
            <Link
              href={buildDiscoverHref({ users: true, q, sort })}
              suppressHydrationWarning
              className={[
                'block rounded-btn px-2 py-1.5 text-body-sm transition-colors',
                usersMode
                  ? 'bg-accent/15 font-weight-label text-accent'
                  : 'text-fg-secondary hover:bg-ghost-surface hover:text-fg',
              ].join(' ')}
              aria-current={usersMode ? 'page' : undefined}
            >
              {t('discover_all_users')}
            </Link>
          </li>
        </ul>
      </section>
    </aside>
  );
}
