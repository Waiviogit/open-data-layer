'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { SortDropdown } from '@/modules/user-social/presentation/components/sort-dropdown';

import { buildDiscoverHref } from '../../domain/discover-url';

export type DiscoverSort = 'newest' | 'oldest' | 'rank';

export type DiscoverSortSelectProps = {
  usersMode: boolean;
  objectType: string | null;
  q: string;
  tags: string[];
  sort: DiscoverSort;
};

export function DiscoverSortSelect({
  usersMode,
  objectType,
  q,
  tags,
  sort,
}: DiscoverSortSelectProps) {
  const { t } = useI18n();
  const router = useRouter();

  const options = useMemo(
    () => [
      { value: 'newest' as const, label: t('discover_sort_newest') },
      { value: 'oldest' as const, label: t('discover_sort_oldest') },
      { value: 'rank' as const, label: t('discover_sort_rank') },
    ],
    [t],
  );

  return (
    <SortDropdown
      value={sort}
      options={options}
      onChange={(next) => {
        router.push(
          buildDiscoverHref({
            users: usersMode,
            type: objectType ?? undefined,
            q,
            tags,
            sort: next,
          }),
        );
      }}
    />
  );
}
