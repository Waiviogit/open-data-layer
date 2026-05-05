'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  USER_SUBSCRIPTION_SORTS,
  type UserSubscriptionSort,
} from '@/modules/user-social/application/dto/user-social.dto';

import { SortDropdown } from './sort-dropdown';

export function UserSocialSubscriptionSort() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = useMemo((): UserSubscriptionSort => {
    const raw = searchParams.get('sort') ?? '';
    return USER_SUBSCRIPTION_SORTS.includes(raw as UserSubscriptionSort)
      ? (raw as UserSubscriptionSort)
      : 'recency';
  }, [searchParams]);

  const options = useMemo(
    () => [
      { value: 'recency' as const, label: t('social_sort_recency') },
      { value: 'rank' as const, label: t('social_sort_rank') },
      { value: 'followers' as const, label: t('social_sort_followers') },
      { value: 'a-z' as const, label: t('social_sort_az') },
    ],
    [t],
  );

  const onChange = useCallback(
    (next: UserSubscriptionSort) => {
      const u = new URLSearchParams(searchParams.toString());
      u.set('sort', next);
      router.replace(`${pathname}?${u.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return <SortDropdown value={sort} options={options} onChange={onChange} />;
}
