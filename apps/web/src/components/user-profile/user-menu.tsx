'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { getSegmentsAfterAccount } from './profile-path';

type UserMenuProps = {
  accountName: string;
  pathname: string;
};

const FEED_SUBSEGMENTS = new Set(['threads', 'comments', 'mentions', 'activity']);

function isFeedSectionActive(rest: string[]): boolean {
  if (rest.length === 0) {
    return true;
  }
  return FEED_SUBSEGMENTS.has(rest[0] ?? '');
}

function isActive(
  rest: string[],
  key:
    | 'feed'
    | 'map'
    | 'user-shop'
    | 'recipe'
    | 'favorites'
    | 'transfers'
    | 'followers'
    | 'expertise'
    | 'about',
): boolean {
  const head = rest[0] ?? '';
  switch (key) {
    case 'feed':
      return isFeedSectionActive(rest);
    case 'map':
      return head === 'map';
    case 'user-shop':
      return head === 'user-shop';
    case 'recipe':
      return head === 'recipe';
    case 'favorites':
      return head === 'favorites';
    case 'transfers':
      return head === 'transfers';
    case 'followers':
      return head === 'followers' || head === 'following' || head === 'following-objects';
    case 'expertise':
      return head === 'expertise-hashtags' || head === 'expertise-objects';
    case 'about':
      return head === 'about';
    default:
      return false;
  }
}

function navLinkClass(active: boolean) {
  return [
    'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-surface text-fg'
      : 'text-muted hover:bg-surface/80 hover:text-fg',
  ].join(' ');
}

export function UserMenu({ accountName, pathname }: UserMenuProps) {
  const { t } = useI18n();
  const rest = getSegmentsAfterAccount(pathname);
  const base = `/@${accountName}`;

  const items: { key: string; href: string; label: string; active: boolean }[] = [
      {
        key: 'feed',
        href: base,
        label: t('posts'),
        active: isActive(rest, 'feed'),
      },
      {
        key: 'map',
        href: `${base}/map`,
        label: t('map'),
        active: isActive(rest, 'map'),
      },
      {
        key: 'user-shop',
        href: `${base}/user-shop`,
        label: t('shop'),
        active: isActive(rest, 'user-shop'),
      },
      {
        key: 'recipe',
        href: `${base}/recipe`,
        label: t('user_profile_recipe'),
        active: isActive(rest, 'recipe'),
      },
      {
        key: 'favorites',
        href: `${base}/favorites`,
        label: t('favorites'),
        active: isActive(rest, 'favorites'),
      },
      {
        key: 'transfers',
        href: `${base}/transfers?type=WAIV`,
        label: t('wallet'),
        active: isActive(rest, 'transfers'),
      },
      {
        key: 'followers',
        href: `${base}/followers`,
        label: t('followers'),
        active: isActive(rest, 'followers'),
      },
      {
        key: 'expertise',
        href: `${base}/expertise-hashtags`,
        label: t('expertise'),
        active: isActive(rest, 'expertise'),
      },
      {
        key: 'about',
        href: `${base}/about`,
        label: t('about'),
        active: isActive(rest, 'about'),
      },
    ];

  return (
    <nav
      className="flex flex-wrap gap-1 border-t border-border pt-3"
      aria-label={t('user_profile_nav_aria')}
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={navLinkClass(item.active)}
          prefetch={false}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
