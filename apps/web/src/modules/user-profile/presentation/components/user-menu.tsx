'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { getSegmentsAfterAccount } from './profile-path';
import {
  getSubmenuVariant,
  getWalletTypeFromSearch,
  isFeedSectionActive,
} from './user-profile-subnav';

type UserMenuProps = {
  accountName: string;
  pathname: string;
  search: string;
};

const WALLET_TYPES = ['WAIV', 'HIVE', 'ENGINE', 'rebalancing'] as const;

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
      return (
        head === 'followers' ||
        head === 'following' ||
        head === 'following-objects'
      );
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
    'inline-flex items-center rounded-btn px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-surface text-fg'
      : 'text-muted hover:bg-surface/80 hover:text-fg',
  ].join(' ');
}

function subNavLinkClass(active: boolean) {
  return [
    'inline-flex items-center rounded-btn px-2.5 py-1.5 text-caption font-medium transition-colors',
    active
      ? 'bg-tertiary text-fg'
      : 'text-muted hover:bg-surface/80 hover:text-fg',
  ].join(' ');
}

function getFeedSubActive(rest: string[], segment: 'posts' | string): boolean {
  if (segment === 'posts') {
    return rest.length === 0;
  }
  return (rest[0] ?? '') === segment;
}

export function UserMenu({ accountName, pathname, search }: UserMenuProps) {
  const { t } = useI18n();
  const rest = getSegmentsAfterAccount(pathname);
  const base = `/@${accountName}`;
  const walletType = getWalletTypeFromSearch(search);
  const submenuVariant = getSubmenuVariant(pathname);

  const items: { key: string; href: string; label: string; active: boolean }[] =
    [
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
    <div className="space-y-0">
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

      {submenuVariant === 'feed' ? (
        <nav
          className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2"
          aria-label={t('user_profile_submenu_feed_aria')}
        >
          <Link
            href={base}
            className={subNavLinkClass(getFeedSubActive(rest, 'posts'))}
            prefetch={false}
          >
            {t('posts')}
          </Link>
          <Link
            href={`${base}/threads`}
            className={subNavLinkClass(getFeedSubActive(rest, 'threads'))}
            prefetch={false}
          >
            {t('threads')}
          </Link>
          <Link
            href={`${base}/comments`}
            className={subNavLinkClass(getFeedSubActive(rest, 'comments'))}
            prefetch={false}
          >
            {t('comments')}
          </Link>
          <Link
            href={`${base}/mentions`}
            className={subNavLinkClass(getFeedSubActive(rest, 'mentions'))}
            prefetch={false}
          >
            {t('mentions')}
          </Link>
          <Link
            href={`${base}/activity`}
            className={subNavLinkClass(getFeedSubActive(rest, 'activity'))}
            prefetch={false}
          >
            {t('activity')}
          </Link>
        </nav>
      ) : null}

      {submenuVariant === 'wallet' ? (
        <nav
          className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2"
          aria-label={t('user_profile_submenu_wallet_aria')}
        >
          {WALLET_TYPES.map((type) => {
            const href =
              type === 'rebalancing'
                ? `${base}/transfers?type=rebalancing`
                : `${base}/transfers?type=${type}`;
            const active = walletType === type;
            return (
              <Link
                key={type}
                href={href}
                className={subNavLinkClass(active)}
                prefetch={false}
              >
                {type === 'WAIV'
                  ? t('waiv_wallet')
                  : type === 'HIVE'
                    ? t('hive_wallet')
                    : type === 'ENGINE'
                      ? t('hive_engine_wallet')
                      : t('rebalance_wallet')}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {submenuVariant === 'followers' ? (
        <nav
          className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2"
          aria-label={t('user_profile_submenu_followers_aria')}
        >
          <Link
            href={`${base}/followers`}
            className={subNavLinkClass((rest[0] ?? '') === 'followers')}
            prefetch={false}
          >
            {t('followers')}
          </Link>
          <Link
            href={`${base}/following`}
            className={subNavLinkClass((rest[0] ?? '') === 'following')}
            prefetch={false}
          >
            {t('following')}
          </Link>
          <Link
            href={`${base}/following-objects`}
            className={subNavLinkClass(
              (rest[0] ?? '') === 'following-objects',
            )}
            prefetch={false}
          >
            {t('user_profile_following_objects')}
          </Link>
        </nav>
      ) : null}

      {submenuVariant === 'expertise' ? (
        <nav
          className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2"
          aria-label={t('user_profile_submenu_expertise_aria')}
        >
          <Link
            href={`${base}/expertise-hashtags`}
            className={subNavLinkClass(
              (rest[0] ?? '') === 'expertise-hashtags',
            )}
            prefetch={false}
          >
            {t('hashtags')}
          </Link>
          <Link
            href={`${base}/expertise-objects`}
            className={subNavLinkClass(
              (rest[0] ?? '') === 'expertise-objects',
            )}
            prefetch={false}
          >
            {t('objects')}
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
