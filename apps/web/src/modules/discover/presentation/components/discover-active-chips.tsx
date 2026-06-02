'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { buildDiscoverHref } from '../../domain/discover-url';
import { ChipRemoveIcon, SearchQueryIcon } from './discover-chip-icons';

export type DiscoverActiveChipsProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  tags: string[];
  sort: 'newest' | 'oldest' | 'rank';
};

export function DiscoverActiveChips({
  usersMode,
  objectType,
  q,
  tags,
  sort,
}: DiscoverActiveChipsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const trimmedQ = q.trim();

  const removeQuery = useCallback(() => {
    router.push(
      buildDiscoverHref({
        users: usersMode,
        type: objectType ?? undefined,
        q: '',
        tags,
        sort,
      }),
    );
  }, [router, usersMode, objectType, tags, sort]);

  if (trimmedQ.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-caption font-weight-label text-fg-tertiary">
        {t('discover_active_search')}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex max-w-full items-center gap-1 rounded-pill border border-border bg-surface-control px-2 py-0.5 text-caption text-fg">
          <SearchQueryIcon />
          <span className="truncate font-weight-label">{trimmedQ}</span>
          <button
            type="button"
            aria-label={t('discover_remove_search').replace('{query}', trimmedQ)}
            className="shrink-0 rounded-circle p-0.5 text-fg-secondary hover:bg-ghost-surface hover:text-fg"
            onClick={removeQuery}
          >
            <ChipRemoveIcon />
          </button>
        </span>
      </div>
    </div>
  );
}
