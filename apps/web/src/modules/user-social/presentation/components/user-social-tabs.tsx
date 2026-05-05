'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { UserSocialTab } from '@/modules/user-social/domain/types/user-social';

export type UserSocialTabsProps = {
  accountName: string;
  active: UserSocialTab;
  followerCount: number;
  followingCount: number;
  objectsCount: number;
};

export function UserSocialTabs({
  accountName,
  active,
  followerCount,
  followingCount,
  objectsCount,
}: UserSocialTabsProps) {
  const { t } = useI18n();
  const base = `/@${accountName}`;

  function tabClass(isActive: boolean) {
    return [
      'inline-flex items-center gap-1 whitespace-nowrap border-b-2 pb-2 text-body-sm font-medium transition-colors',
      isActive ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg',
    ].join(' ');
  }

  return (
    <nav
      className="mb-6 flex flex-wrap gap-6 border-b border-border"
      aria-label="Profile social sections"
    >
      <Link href={`${base}/followers`} className={tabClass(active === 'followers')}>
        <span className="font-semibold">{t('followers')}</span>
        <span className="text-caption text-fg-secondary">{followerCount}</span>
      </Link>
      <Link href={`${base}/following`} className={tabClass(active === 'following')}>
        <span className="font-semibold">{t('following')}</span>
        <span className="text-caption text-fg-secondary">{followingCount}</span>
      </Link>
      <Link href={`${base}/following-objects`} className={tabClass(active === 'objects')}>
        <span className="font-semibold">{t('objects')}</span>
        <span className="text-caption text-fg-secondary">{objectsCount}</span>
      </Link>
    </nav>
  );
}
