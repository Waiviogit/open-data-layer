'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  USER_OBJECT_LIST_SORTS,
  type UserObjectListSort,
} from '@/modules/user-social/application/dto/user-social.dto';

import { SortDropdown } from './sort-dropdown';

export function UserSocialObjectsSort() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = useMemo((): UserObjectListSort => {
    const raw = searchParams.get('sort') ?? '';
    return USER_OBJECT_LIST_SORTS.includes(raw as UserObjectListSort)
      ? (raw as UserObjectListSort)
      : 'weight';
  }, [searchParams]);

  const options = useMemo(
    () => [
      { value: 'weight' as const, label: t('social_sort_object_weight') },
      { value: 'recency' as const, label: t('social_sort_object_recency') },
    ],
    [t],
  );

  const onChange = useCallback(
    (next: UserObjectListSort) => {
      const u = new URLSearchParams(searchParams.toString());
      u.set('sort', next);
      router.replace(`${pathname}?${u.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return <SortDropdown value={sort} options={options} onChange={onChange} />;
}
