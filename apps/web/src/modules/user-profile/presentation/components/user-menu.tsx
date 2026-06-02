'use client';

import Link from 'next/link';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { getVisibleMenuKeys, useShellMode } from '@/shell-mode';

import { getSegmentsAfterAccount } from './profile-path';
import {
  getSubmenuVariant,
  getWalletTypeFromSearch,
  isFeedSectionActive,
} from './user-profile-subnav';
import { useUserProfileSocialCounts } from './user-profile-social-counts-context';

export type UserMenuDirection = 'horizontal' | 'vertical';

type UserMenuProps = {
  accountName: string;
  pathname: string;
  search: string;
  direction?: UserMenuDirection;
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

function navLinkClass(active: boolean, vertical: boolean) {
  if (vertical) {
    return [
      'flex w-full items-center rounded-btn px-3 py-2.5 text-body-sm font-weight-label transition-colors',
      active
        ? 'bg-surface text-fg'
        : 'text-muted hover:bg-surface/80 hover:text-fg',
    ].join(' ');
  }
  return [
    'inline-flex items-center rounded-btn px-3 py-2 text-body-sm font-weight-label transition-colors',
    active
      ? 'bg-surface text-fg'
      : 'text-muted hover:bg-surface/80 hover:text-fg',
  ].join(' ');
}

function subNavLinkClass(active: boolean, vertical: boolean) {
  if (vertical) {
    return [
      'flex w-full items-center rounded-btn px-3 py-2 text-caption font-weight-label transition-colors pl-5',
      active
        ? 'bg-tertiary text-tertiary-fg'
        : 'text-muted hover:bg-surface/80 hover:text-fg',
    ].join(' ');
  }
  return [
    'inline-flex items-center rounded-btn px-2.5 py-1.5 text-caption font-weight-label transition-colors',
    active
      ? 'bg-tertiary text-tertiary-fg'
      : 'text-muted hover:bg-surface/80 hover:text-fg',
  ].join(' ');
}

function SocialSubmenuLinkLabel({
  label,
  count,
}: {
  label: string;
  count?: number;
}) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1 whitespace-nowrap">
      <span className="font-weight-strong">{label}</span>
      {count !== undefined ? (
        <span className="shrink-0 text-caption text-fg-secondary">{count}</span>
      ) : null}
    </span>
  );
}

function getFeedSubActive(rest: string[], segment: 'posts' | string): boolean {
  if (segment === 'posts') {
    return rest.length === 0;
  }
  return (rest[0] ?? '') === segment;
}

export function UserMenu({
  accountName,
  pathname,
  search,
  direction = 'horizontal',
}: UserMenuProps) {
  const { t } = useI18n();
  const { resolvedMode } = useShellMode();
  const visibleMenuKeys = getVisibleMenuKeys(resolvedMode);
  const rest = getSegmentsAfterAccount(pathname);
  const base = `/@${accountName}`;
  const walletType = getWalletTypeFromSearch(search);
  const submenuVariant = getSubmenuVariant(pathname);
  const socialCounts = useUserProfileSocialCounts();

  const items: {
    key: string;
    href: string;
    label: string;
    active: boolean;
    mobileOnly?: boolean;
  }[] = [
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
        mobileOnly: true,
      },
    ];

  const primaryItems = visibleMenuKeys
    ? items.filter((item) => visibleMenuKeys.has(item.key))
    : items;

  const isVertical = direction === 'vertical';

  if (isVertical) {
    return (
      <div className="space-y-1">
        <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_nav_aria')}>
          {primaryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={navLinkClass(item.active, true)}
              prefetch={false}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {submenuVariant === 'feed' && visibleMenuKeys == null ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_feed_aria')}>
            <Link href={base} className={subNavLinkClass(getFeedSubActive(rest, 'posts'), true)} prefetch={false}>{t('posts')}</Link>
            <Link href={`${base}/threads`} className={subNavLinkClass(getFeedSubActive(rest, 'threads'), true)} prefetch={false}>{t('threads')}</Link>
            <Link href={`${base}/comments`} className={subNavLinkClass(getFeedSubActive(rest, 'comments'), true)} prefetch={false}>{t('comments')}</Link>
            <Link href={`${base}/mentions`} className={subNavLinkClass(getFeedSubActive(rest, 'mentions'), true)} prefetch={false}>{t('mentions')}</Link>
            <Link href={`${base}/activity`} className={subNavLinkClass(getFeedSubActive(rest, 'activity'), true)} prefetch={false}>{t('activity')}</Link>
          </nav>
        ) : null}

        {submenuVariant === 'wallet' ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_wallet_aria')}>
            {WALLET_TYPES.map((type) => {
              const href = type === 'rebalancing' ? `${base}/transfers?type=rebalancing` : `${base}/transfers?type=${type}`;
              return (
                <Link key={type} href={href} className={subNavLinkClass(walletType === type, true)} prefetch={false}>
                  {type === 'WAIV' ? t('waiv_wallet') : type === 'HIVE' ? t('hive_wallet') : type === 'ENGINE' ? t('hive_engine_wallet') : t('rebalance_wallet')}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {submenuVariant === 'followers' ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_followers_aria')}>
            <Link href={`${base}/followers`} className={subNavLinkClass((rest[0] ?? '') === 'followers', true)} prefetch={false}>
              <SocialSubmenuLinkLabel label={t('followers')} count={socialCounts?.followerCount} />
            </Link>
            <Link href={`${base}/following`} className={subNavLinkClass((rest[0] ?? '') === 'following', true)} prefetch={false}>
              <SocialSubmenuLinkLabel label={t('following')} count={socialCounts?.followingCount} />
            </Link>
            <Link href={`${base}/following-objects`} className={subNavLinkClass((rest[0] ?? '') === 'following-objects', true)} prefetch={false}>
              <SocialSubmenuLinkLabel label={t('user_profile_following_objects')} count={socialCounts?.followingObjectsCount} />
            </Link>
          </nav>
        ) : null}

        {submenuVariant === 'expertise' ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_expertise_aria')}>
            <Link href={`${base}/expertise-hashtags`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-hashtags', true)} prefetch={false}>{t('hashtags')}</Link>
            <Link href={`${base}/expertise-objects`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-objects', true)} prefetch={false}>{t('objects')}</Link>
          </nav>
        ) : null}
      </div>
    );
  }

  // Horizontal layout: both rows share a single centered block so the sub-menu's
  // left edge aligns with the first item of the main menu.
  return (
    <div className="border-t border-border pt-3">
      <div className="mx-auto w-fit">
        <nav className="flex flex-wrap gap-1" aria-label={t('user_profile_nav_aria')}>
          {primaryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={[
                navLinkClass(item.active, false),
                item.mobileOnly ? 'lg:hidden' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              prefetch={false}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {submenuVariant === 'feed' && visibleMenuKeys == null ? (
          <nav className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2" aria-label={t('user_profile_submenu_feed_aria')}>
            <Link href={base} className={subNavLinkClass(getFeedSubActive(rest, 'posts'), false)} prefetch={false}>{t('posts')}</Link>
            <Link href={`${base}/threads`} className={subNavLinkClass(getFeedSubActive(rest, 'threads'), false)} prefetch={false}>{t('threads')}</Link>
            <Link href={`${base}/comments`} className={subNavLinkClass(getFeedSubActive(rest, 'comments'), false)} prefetch={false}>{t('comments')}</Link>
            <Link href={`${base}/mentions`} className={subNavLinkClass(getFeedSubActive(rest, 'mentions'), false)} prefetch={false}>{t('mentions')}</Link>
            <Link href={`${base}/activity`} className={subNavLinkClass(getFeedSubActive(rest, 'activity'), false)} prefetch={false}>{t('activity')}</Link>
          </nav>
        ) : null}

        {submenuVariant === 'wallet' ? (
          <nav className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2" aria-label={t('user_profile_submenu_wallet_aria')}>
            {WALLET_TYPES.map((type) => {
              const href = type === 'rebalancing' ? `${base}/transfers?type=rebalancing` : `${base}/transfers?type=${type}`;
              return (
                <Link key={type} href={href} className={subNavLinkClass(walletType === type, false)} prefetch={false}>
                  {type === 'WAIV' ? t('waiv_wallet') : type === 'HIVE' ? t('hive_wallet') : type === 'ENGINE' ? t('hive_engine_wallet') : t('rebalance_wallet')}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {submenuVariant === 'followers' ? (
          <nav className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2" aria-label={t('user_profile_submenu_followers_aria')}>
            <Link href={`${base}/followers`} className={subNavLinkClass((rest[0] ?? '') === 'followers', false)} prefetch={false}>
              <SocialSubmenuLinkLabel label={t('followers')} count={socialCounts?.followerCount} />
            </Link>
            <Link href={`${base}/following`} className={subNavLinkClass((rest[0] ?? '') === 'following', false)} prefetch={false}>
              <SocialSubmenuLinkLabel label={t('following')} count={socialCounts?.followingCount} />
            </Link>
            <Link href={`${base}/following-objects`} className={subNavLinkClass((rest[0] ?? '') === 'following-objects', false)} prefetch={false}>
              <SocialSubmenuLinkLabel label={t('user_profile_following_objects')} count={socialCounts?.followingObjectsCount} />
            </Link>
          </nav>
        ) : null}

        {submenuVariant === 'expertise' ? (
          <nav className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2" aria-label={t('user_profile_submenu_expertise_aria')}>
            <Link href={`${base}/expertise-hashtags`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-hashtags', false)} prefetch={false}>{t('hashtags')}</Link>
            <Link href={`${base}/expertise-objects`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-objects', false)} prefetch={false}>{t('objects')}</Link>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
