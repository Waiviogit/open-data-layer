'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserAvatar } from '@/shared/presentation';

import type { AppHeaderUser } from '../../domain/app-header-user';

function WritePostIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 15.5 4 8h16l-8 7.5z" />
    </svg>
  );
}

function MenuRowDisabled({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled
      role="menuitem"
      title={title}
      className="flex w-full cursor-not-allowed items-center rounded-btn px-3 py-2 text-start text-body-sm text-fg-disabled"
    >
      {children}
    </button>
  );
}

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

export function LoggedInHeaderActions({ user }: LoggedInHeaderActionsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  const feedHref = `/@${encodeURIComponent(user.username)}`;
  const profileAboutHref = `/@${encodeURIComponent(user.username)}/about`;
  const profileMainPath = `/user-profile/${user.username}`;
  const profileAboutPath = `/user-profile/${user.username}/about`;
  const comingSoon = t('app_header_coming_soon');

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
        className="rounded-btn p-2 text-fg-secondary hover:bg-ghost-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        suppressHydrationWarning
      >
        <WritePostIcon />
      </Link>

      <button
        type="button"
        disabled
        aria-disabled
        title={comingSoon}
        aria-label={t('notifications')}
        className="rounded-btn p-2 text-fg-secondary opacity-60 hover:bg-transparent disabled:cursor-not-allowed"
      >
        <BellIcon />
      </button>

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
          className={[
            'inline-flex shrink-0 rounded-btn p-1 text-fg',
            'hover:bg-ghost-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          ].join(' ')}
        >
          <ChevronDownIcon className="text-accent" />
        </button>

        {menuOpen ? (
          <div
            id={`${menuId}-menu`}
            role="menu"
            aria-labelledby={`${menuId}-trigger`}
            className="absolute end-0 top-full z-[60] mt-1 min-w-[12rem] rounded-card border border-border bg-surface py-1 shadow-card"
          >
            <Link
              href={feedHref}
              role="menuitem"
              aria-current={pathname === profileMainPath ? 'page' : undefined}
              className={menuNavLinkClassName(pathname === profileMainPath)}
              onClick={() => setMenuOpen(false)}
              suppressHydrationWarning
            >
              {t('my_feed')}
            </Link>
            <MenuRowDisabled title={comingSoon}>{t('earn')}</MenuRowDisabled>
            <MenuRowDisabled title={comingSoon}>{t('tools')}</MenuRowDisabled>
            <Link
              href="/drafts"
              role="menuitem"
              aria-current={pathname === '/drafts' ? 'page' : undefined}
              className={menuNavLinkClassName(pathname === '/drafts')}
              onClick={() => setMenuOpen(false)}
              suppressHydrationWarning
            >
              {t('drafts')}
            </Link>
            <Link
              href={profileAboutHref}
              role="menuitem"
              aria-current={pathname === profileAboutPath ? 'page' : undefined}
              className={menuNavLinkClassName(pathname === profileAboutPath)}
              onClick={() => setMenuOpen(false)}
              suppressHydrationWarning
            >
              {t('my_profile')}
            </Link>
            <MenuRowDisabled title={comingSoon}>{t('wallet')}</MenuRowDisabled>
            <Link
              href="/settings"
              role="menuitem"
              aria-current={pathname === '/settings' ? 'page' : undefined}
              className={menuNavLinkClassName(pathname === '/settings')}
              onClick={() => setMenuOpen(false)}
              suppressHydrationWarning
            >
              {t('settings')}
            </Link>
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
