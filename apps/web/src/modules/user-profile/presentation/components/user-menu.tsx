'use client';

import type { ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import {
  profileSectionTabClass,
  profileSectionVerticalLinkClass,
} from '@/shared/presentation';
import {
  HORIZONTAL_TAB_NAV_PRIMARY_ROW_CLASS,
  HORIZONTAL_TAB_NAV_SUB_ROW_CLASS,
} from '@/shared/presentation/layout/horizontal-tab-nav-classes';
import { ScrollableHorizontalTabNav } from '@/shared/presentation/layout/scrollable-horizontal-tab-nav';
import { getDesktopMenuKeys, HIDDEN_ON_DESKTOP_CLASS, useShellMode } from '@/shell-mode';

import { getSegmentsAfterAccount } from './profile-path';
import {
  getSubmenuVariant,
  getWalletTypeFromSearch,
  isFeedSectionActive,
} from './user-profile-subnav';
import { useUserProfileSocialCounts } from './user-profile-social-counts-context';
import { useEffectiveProfileNav } from './user-profile-pending-nav-context';
import { UserProfileNavLink } from './user-profile-nav-link';
import { ProfileFeedTabLabel } from './profile-tab-unread-badge';

export type UserMenuDirection = 'horizontal' | 'vertical';

export type UserMenuRows = 'primary' | 'submenu' | 'all';

type UserMenuProps = {
  accountName: string;
  direction?: UserMenuDirection;
  /** Horizontal: split primary (hero) vs submenu (center column). Vertical rail always shows all. */
  rows?: UserMenuRows;
};

const WALLET_TYPES = ['WAIV', 'HIVE', 'ENGINE'] as const;

type HorizontalNavBleed = 'gutter' | 'card' | 'none';

function HorizontalTabNavShell({
  children,
  ariaLabel,
  rowClass,
  bleed = 'gutter',
  className,
}: {
  children: ReactNode;
  ariaLabel: string;
  rowClass: string;
  bleed?: HorizontalNavBleed;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <ScrollableHorizontalTabNav
      ariaLabel={ariaLabel}
      rowClass={[rowClass, className].filter(Boolean).join(' ')}
      bleed={bleed}
      activeItemSelector="nav a.text-accent"
      scrollPrevAriaLabel={t('previous')}
      scrollNextAriaLabel={t('next')}
    >
      {children}
    </ScrollableHorizontalTabNav>
  );
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
      return head === 'transfers' || head === 'permissions';
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
    return profileSectionVerticalLinkClass(active, false);
  }
  return profileSectionTabClass(active, 'primary');
}

function subNavLinkClass(active: boolean, vertical: boolean) {
  if (vertical) {
    return profileSectionVerticalLinkClass(active, true);
  }
  return profileSectionTabClass(active, 'sub');
}

function WalletSubmenuLinks({
  base,
  vertical,
  onPermissions,
  walletType,
}: {
  base: string;
  vertical: boolean;
  onPermissions: boolean;
  walletType: string;
}) {
  const { t } = useI18n();
  return (
    <>
      {WALLET_TYPES.map((type) => (
        <UserProfileNavLink
          key={type}
          href={`${base}/transfers?type=${type}`}
          method="replace"
          className={subNavLinkClass(!onPermissions && walletType === type, vertical)}
        >
          {type === 'WAIV'
            ? t('waiv_wallet')
            : type === 'HIVE'
              ? t('hive_wallet')
              : t('hive_engine_wallet')}
        </UserProfileNavLink>
      ))}
      <UserProfileNavLink
        href={`${base}/permissions`}
        className={subNavLinkClass(onPermissions, vertical)}
      >
        {t('wallet_authorizations')}
      </UserProfileNavLink>
    </>
  );
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

function primaryNavLinkClass(
  active: boolean,
  vertical: boolean,
  item: { key: string; mobileOnly?: boolean },
  desktopKeys: Set<string> | null,
): string {
  return [
    navLinkClass(active, vertical),
    item.mobileOnly ? 'lg:hidden' : '',
    desktopKeys && !desktopKeys.has(item.key) ? HIDDEN_ON_DESKTOP_CLASS : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function FeedSubmenuNav({
  base,
  rest,
  vertical,
  className,
  bleed = 'gutter',
}: {
  base: string;
  rest: string[];
  vertical: boolean;
  className?: string;
  bleed?: HorizontalNavBleed;
}) {
  const { t } = useI18n();
  const linkClass = (segment: 'posts' | string) =>
    subNavLinkClass(getFeedSubActive(rest, segment), vertical);

  if (vertical) {
    return (
      <nav
        className={['flex flex-col gap-0.5', className].filter(Boolean).join(' ')}
        aria-label={t('user_profile_submenu_feed_aria')}
      >
        <UserProfileNavLink href={base} className={linkClass('posts')}>
          <ProfileFeedTabLabel label={t('posts')} tab="posts" />
        </UserProfileNavLink>
        <UserProfileNavLink href={`${base}/threads`} className={linkClass('threads')}>
          <ProfileFeedTabLabel label={t('threads')} tab="threads" />
        </UserProfileNavLink>
        <UserProfileNavLink href={`${base}/comments`} className={linkClass('comments')}>{t('comments')}</UserProfileNavLink>
        <UserProfileNavLink href={`${base}/mentions`} className={linkClass('mentions')}>{t('mentions')}</UserProfileNavLink>
        <UserProfileNavLink href={`${base}/activity`} className={linkClass('activity')}>{t('activity')}</UserProfileNavLink>
      </nav>
    );
  }

  return (
    <HorizontalTabNavShell
      ariaLabel={t('user_profile_submenu_feed_aria')}
      rowClass={HORIZONTAL_TAB_NAV_SUB_ROW_CLASS}
      bleed={bleed}
      className={className}
    >
      <UserProfileNavLink href={base} className={linkClass('posts')}>
        <ProfileFeedTabLabel label={t('posts')} tab="posts" />
      </UserProfileNavLink>
      <UserProfileNavLink href={`${base}/threads`} className={linkClass('threads')}>
        <ProfileFeedTabLabel label={t('threads')} tab="threads" />
      </UserProfileNavLink>
      <UserProfileNavLink href={`${base}/comments`} className={linkClass('comments')}>{t('comments')}</UserProfileNavLink>
      <UserProfileNavLink href={`${base}/mentions`} className={linkClass('mentions')}>{t('mentions')}</UserProfileNavLink>
      <UserProfileNavLink href={`${base}/activity`} className={linkClass('activity')}>{t('activity')}</UserProfileNavLink>
    </HorizontalTabNavShell>
  );
}

export function UserMenu(props: UserMenuProps) {
  return <UserMenuInner {...props} />;
}

function UserMenuInner({
  accountName,
  direction = 'horizontal',
  rows = 'all',
}: UserMenuProps) {
  const { t } = useI18n();
  const { resolvedMode } = useShellMode();
  const desktopMenuKeys = getDesktopMenuKeys(resolvedMode);
  const { pathname, search } = useEffectiveProfileNav();
  const rest = getSegmentsAfterAccount(pathname);
  const base = `/@${accountName}`;
  const walletType = getWalletTypeFromSearch(search);
  const submenuVariant = getSubmenuVariant(pathname);
  const onPermissions = (rest[0] ?? '') === 'permissions';
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
        label:
          socialCounts?.followerCount != null
            ? `${t('followers')} ${socialCounts.followerCount}`
            : t('followers'),
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

  const primaryItems = items;

  const isVertical = direction === 'vertical';
  const showPrimary = isVertical || rows === 'primary' || rows === 'all';
  const showSubmenu = isVertical || rows === 'submenu' || rows === 'all';

  const submenuBleed: HorizontalNavBleed = rows === 'submenu' ? 'card' : 'gutter';

  const horizontalSubmenu =
    submenuVariant === 'feed' ? (
      <FeedSubmenuNav
        base={base}
        rest={rest}
        vertical={false}
        bleed={submenuBleed}
        className={desktopMenuKeys ? HIDDEN_ON_DESKTOP_CLASS : undefined}
      />
    ) : submenuVariant === 'wallet' ? (
      <HorizontalTabNavShell
        ariaLabel={t('user_profile_submenu_wallet_aria')}
        rowClass={HORIZONTAL_TAB_NAV_SUB_ROW_CLASS}
        bleed={submenuBleed}
      >
        <WalletSubmenuLinks
          base={base}
          vertical={false}
          onPermissions={onPermissions}
          walletType={walletType}
        />
      </HorizontalTabNavShell>
    ) : submenuVariant === 'followers' ? (
      <HorizontalTabNavShell
        ariaLabel={t('user_profile_submenu_followers_aria')}
        rowClass={HORIZONTAL_TAB_NAV_SUB_ROW_CLASS}
        bleed={submenuBleed}
      >
        <UserProfileNavLink href={`${base}/followers`} className={subNavLinkClass((rest[0] ?? '') === 'followers', false)}>
          <SocialSubmenuLinkLabel label={t('followers')} count={socialCounts?.followerCount} />
        </UserProfileNavLink>
        <UserProfileNavLink href={`${base}/following`} className={subNavLinkClass((rest[0] ?? '') === 'following', false)}>
          <SocialSubmenuLinkLabel label={t('following')} count={socialCounts?.followingCount} />
        </UserProfileNavLink>
        <UserProfileNavLink href={`${base}/following-objects`} className={subNavLinkClass((rest[0] ?? '') === 'following-objects', false)}>
          <SocialSubmenuLinkLabel label={t('user_profile_following_objects')} count={socialCounts?.followingObjectsCount} />
        </UserProfileNavLink>
      </HorizontalTabNavShell>
    ) : submenuVariant === 'expertise' ? (
      <HorizontalTabNavShell
        ariaLabel={t('user_profile_submenu_expertise_aria')}
        rowClass={HORIZONTAL_TAB_NAV_SUB_ROW_CLASS}
        bleed={submenuBleed}
      >
        <UserProfileNavLink href={`${base}/expertise-hashtags`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-hashtags', false)}>
          <SocialSubmenuLinkLabel label={t('hashtags')} count={socialCounts?.hashtagsExpCount} />
        </UserProfileNavLink>
        <UserProfileNavLink href={`${base}/expertise-objects`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-objects', false)}>
          <SocialSubmenuLinkLabel label={t('objects')} count={socialCounts?.objectsExpCount} />
        </UserProfileNavLink>
      </HorizontalTabNavShell>
    ) : null;

  if (isVertical) {
    return (
      <div className="space-y-1">
        <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_nav_aria')}>
          {primaryItems.map((item) => (
            <UserProfileNavLink
              key={item.key}
              href={item.href}
              className={primaryNavLinkClass(item.active, true, item, desktopMenuKeys)}
            >
              {item.label}
            </UserProfileNavLink>
          ))}
        </nav>

        {submenuVariant === 'feed' ? (
          <FeedSubmenuNav
            base={base}
            rest={rest}
            vertical
            className={desktopMenuKeys ? HIDDEN_ON_DESKTOP_CLASS : undefined}
          />
        ) : null}

        {submenuVariant === 'wallet' ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_wallet_aria')}>
            <WalletSubmenuLinks
              base={base}
              vertical
              onPermissions={onPermissions}
              walletType={walletType}
            />
          </nav>
        ) : null}

        {submenuVariant === 'followers' ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_followers_aria')}>
            <UserProfileNavLink href={`${base}/followers`} className={subNavLinkClass((rest[0] ?? '') === 'followers', true)}>
              <SocialSubmenuLinkLabel label={t('followers')} count={socialCounts?.followerCount} />
            </UserProfileNavLink>
            <UserProfileNavLink href={`${base}/following`} className={subNavLinkClass((rest[0] ?? '') === 'following', true)}>
              <SocialSubmenuLinkLabel label={t('following')} count={socialCounts?.followingCount} />
            </UserProfileNavLink>
            <UserProfileNavLink href={`${base}/following-objects`} className={subNavLinkClass((rest[0] ?? '') === 'following-objects', true)}>
              <SocialSubmenuLinkLabel label={t('user_profile_following_objects')} count={socialCounts?.followingObjectsCount} />
            </UserProfileNavLink>
          </nav>
        ) : null}

        {submenuVariant === 'expertise' ? (
          <nav className="flex flex-col gap-0.5" aria-label={t('user_profile_submenu_expertise_aria')}>
            <UserProfileNavLink href={`${base}/expertise-hashtags`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-hashtags', true)}>
              <SocialSubmenuLinkLabel label={t('hashtags')} count={socialCounts?.hashtagsExpCount} />
            </UserProfileNavLink>
            <UserProfileNavLink href={`${base}/expertise-objects`} className={subNavLinkClass((rest[0] ?? '') === 'expertise-objects', true)}>
              <SocialSubmenuLinkLabel label={t('objects')} count={socialCounts?.objectsExpCount} />
            </UserProfileNavLink>
          </nav>
        ) : null}
      </div>
    );
  }

  if (rows === 'submenu') {
    return horizontalSubmenu;
  }

  if (rows === 'primary') {
    return (
      <HorizontalTabNavShell
        ariaLabel={t('user_profile_nav_aria')}
        rowClass={HORIZONTAL_TAB_NAV_PRIMARY_ROW_CLASS}
        bleed="gutter"
      >
        {primaryItems.map((item) => (
          <UserProfileNavLink
            key={item.key}
            href={item.href}
            className={primaryNavLinkClass(item.active, false, item, desktopMenuKeys)}
          >
            {item.label}
          </UserProfileNavLink>
        ))}
      </HorizontalTabNavShell>
    );
  }

  // Horizontal: primary + submenu stacked in the center column.
  return (
    <div className="flex min-w-0 flex-col">
      {showPrimary ? (
        <HorizontalTabNavShell
          ariaLabel={t('user_profile_nav_aria')}
          rowClass={HORIZONTAL_TAB_NAV_PRIMARY_ROW_CLASS}
          bleed="gutter"
        >
          {primaryItems.map((item) => (
            <UserProfileNavLink
              key={item.key}
              href={item.href}
              className={primaryNavLinkClass(item.active, false, item, desktopMenuKeys)}
            >
              {item.label}
            </UserProfileNavLink>
          ))}
        </HorizontalTabNavShell>
      ) : null}
      {showSubmenu ? horizontalSubmenu : null}
    </div>
  );
}
