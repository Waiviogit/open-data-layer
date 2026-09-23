'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { ChevronDownIcon, PenLineIcon } from '@/icons';
import { businessRoutes } from '@/modules/business';
import { NotificationBell } from '@/modules/notifications';
import { clearWalletSession } from '@/modules/auth/infrastructure';
import { UserAvatar } from '@/shared/presentation';

import type { AppHeaderUser } from '../../domain/app-header-user';

/** 32×32 hit target — matches `UserAvatar` size={32} and unread notification badge. */
const HEADER_ICON_BTN_CLASS =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-btn p-0 leading-none text-nav-fg hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&_svg]:block';

const HEADER_ICON_SIZE = 20;

export type LoggedInHeaderActionsProps = {
  user: AppHeaderUser;
};

function menuNavLinkClassName(active: boolean): string {
  return [
    'app-header-menu-feed-link',
    active ? 'text-heading font-weight-label' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const MENU_DISABLED_CLASS =
  'block w-full cursor-not-allowed px-3 py-2 text-start text-body-sm text-fg-secondary';

type OwnProfileSection = 'feed' | 'about' | 'transfers' | 'messages';

function isOwnProfileSection(
  pathname: string,
  username: string,
  section: OwnProfileSection,
): boolean {
  const prefixes = [
    `/@${encodeURIComponent(username)}`,
    `/@${username}`,
    `/user-profile/${encodeURIComponent(username)}`,
    `/user-profile/${username}`,
  ];
  for (const prefix of new Set(prefixes)) {
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
      continue;
    }
    const rest = pathname.slice(prefix.length).split('/').filter(Boolean);
    if (section === 'feed') {
      return rest.length === 0;
    }
    return rest[0] === section;
  }
  return false;
}

function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function AccountMenuLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  onNavigate: () => void;
  children: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      className={menuNavLinkClassName(active)}
      onClick={onNavigate}
      suppressHydrationWarning
    >
      {children}
    </Link>
  );
}

function DisabledAccountMenuItem({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <div
      role="menuitem"
      aria-disabled="true"
      title={title}
      className={MENU_DISABLED_CLASS}
    >
      {label}
    </div>
  );
}

export function LoggedInHeaderActions({ user }: LoggedInHeaderActionsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  const username = user.username;
  const feedHref = `/@${encodeURIComponent(username)}`;
  const profileAboutHref = `${feedHref}/about`;
  const messagesHref = `${feedHref}/messages`;
  const walletHref = `${feedHref}/transfers?type=WAIV`;
  const comingSoon = t('app_header_coming_soon');
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) {
        return;
      }
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function onLogout() {
    setLogoutPending(true);
    clearWalletSession();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      setMenuOpen(false);
      router.refresh();
    } finally {
      setLogoutPending(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="flex shrink-0 items-center gap-1 sm:gap-2"
    >
      <Link
        href="/editor"
        title={t('write_post')}
        aria-label={t('write_post')}
        className={HEADER_ICON_BTN_CLASS}
        suppressHydrationWarning
      >
        <PenLineIcon size={HEADER_ICON_SIZE} />
      </Link>

      <NotificationBell
        username={user.username}
        triggerClassName={HEADER_ICON_BTN_CLASS}
        iconSize={HEADER_ICON_SIZE}
      />

      <div className="relative flex items-center gap-0.5">
        <Link
          href={feedHref}
          onClick={() => setMenuOpen(false)}
          className="app-header-avatar-link"
          aria-label={t('my_profile')}
          suppressHydrationWarning
        >
          <UserAvatar username={user.username} size={32} />
        </Link>
        <button
          ref={triggerRef}
          type="button"
          id={`${menuId}-trigger`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? `${menuId}-menu` : undefined}
          aria-label={t('app_header_account_menu_aria')}
          onClick={() => setMenuOpen((o) => !o)}
          className={HEADER_ICON_BTN_CLASS}
        >
          <ChevronDownIcon size={HEADER_ICON_SIZE} />
        </button>

        {menuOpen ? (
          <div
            id={`${menuId}-menu`}
            role="menu"
            aria-labelledby={`${menuId}-trigger`}
            className="absolute end-0 top-full z-[60] mt-1 min-w-[12rem] rounded-card border border-border bg-surface py-1 shadow-card"
          >
            <AccountMenuLink
              href={feedHref}
              active={isOwnProfileSection(pathname, username, 'feed')}
              onNavigate={closeMenu}
            >
              {t('my_feed')}
            </AccountMenuLink>
            <AccountMenuLink
              href={profileAboutHref}
              active={isOwnProfileSection(pathname, username, 'about')}
              onNavigate={closeMenu}
            >
              {t('my_profile')}
            </AccountMenuLink>
            <AccountMenuLink
              href={walletHref}
              active={isOwnProfileSection(pathname, username, 'transfers')}
              onNavigate={closeMenu}
            >
              {t('wallet')}
            </AccountMenuLink>
            <div role="separator" className="my-1 border-t border-border" />
            <AccountMenuLink
              href={messagesHref}
              active={isOwnProfileSection(pathname, username, 'messages')}
              onNavigate={closeMenu}
            >
              {t('messages')}
            </AccountMenuLink>
            <DisabledAccountMenuItem label={t('bookmarks')} title={comingSoon} />
            <AccountMenuLink
              href="/drafts"
              active={isPathActive(pathname, '/drafts')}
              onNavigate={closeMenu}
            >
              {t('drafts')}
            </AccountMenuLink>
            <DisabledAccountMenuItem label={t('vault')} title={comingSoon} />
            <div role="separator" className="my-1 border-t border-border" />
            <AccountMenuLink
              href={businessRoutes.relationships}
              active={isPathActive(pathname, businessRoutes.relationships)}
              onNavigate={closeMenu}
            >
              {t('orders')}
            </AccountMenuLink>
            <DisabledAccountMenuItem label={t('billing')} title={comingSoon} />
            <AccountMenuLink
              href="/settings"
              active={isPathActive(pathname, '/settings')}
              onNavigate={closeMenu}
            >
              {t('settings')}
            </AccountMenuLink>
            <div role="separator" className="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              disabled={logoutPending}
              onClick={() => void onLogout()}
              className="flex w-full items-center rounded-btn px-3 py-2 text-start text-body-sm text-fg hover:bg-ghost-surface disabled:opacity-50"
            >
              {logoutPending ? '…' : t('logout')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
