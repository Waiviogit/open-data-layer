'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useLoginModal } from '@/modules/auth';
import { useI18n } from '@/i18n/providers/i18n-provider';

export type StoryOverflowMenuProps = {
  authorName: string;
  editHref: string;
  /** Logged-in viewer username, or null when logged out. */
  currentUsername: string | null;
  isOwnPost: boolean;
};

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
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

function IconPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 0-.59-1.41L2 3v4h4" />
      <path d="M9.41 5.41 19 15a2 2 0 0 0 2.8 0l.6-.6a2 2 0 0 0 0-2.8L12.24 2.24a2 2 0 0 0-2.8 0l-.83.83" />
    </svg>
  );
}

function IconStarOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function IconXLogo({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function IconUnfollow({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconHide({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconMute({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconFlag({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function IconMoreTrigger({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

type MenuRowProps = {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  onActivate: () => void;
};

function MenuRow({ icon, label, disabled, onActivate }: MenuRowProps) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        className={[
          'flex w-full items-center gap-3 px-3 py-2.5 text-left text-body-sm text-fg-secondary',
          'transition-colors hover:bg-surface-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus',
          disabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : 'cursor-pointer',
        ].join(' ')}
        onClick={() => {
          if (!disabled) {
            onActivate();
          }
        }}
      >
        <span className="shrink-0 text-muted [&_svg]:text-muted">{icon}</span>
        <span className="min-w-0 flex-1">{label}</span>
      </button>
    </li>
  );
}

type MenuLinkRowProps = {
  icon: ReactNode;
  label: string;
  href: string;
  onNavigate: () => void;
};

function MenuLinkRow({ icon, label, href, onNavigate }: MenuLinkRowProps) {
  return (
    <li role="none">
      <Link
        href={href}
        role="menuitem"
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-body-sm text-fg-secondary transition-colors hover:bg-surface-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
        onClick={onNavigate}
      >
        <span className="shrink-0 text-muted [&_svg]:text-muted">{icon}</span>
        <span className="min-w-0 flex-1">{label}</span>
      </Link>
    </li>
  );
}

export function StoryOverflowMenu({
  authorName,
  editHref,
  currentUsername,
  isOwnPost,
}: StoryOverflowMenuProps) {
  const { t } = useI18n();
  const { openLogin } = useLoginModal();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const loggedIn = currentUsername != null && currentUsername !== '';

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocMouseDown(e: MouseEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  function requireLoginOr(fn: () => void) {
    if (!loggedIn) {
      openLogin();
      closeMenu();
      return;
    }
    fn();
  }

  const showOwnVariant = loggedIn && isOwnPost;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center rounded-md px-1 py-1 text-caption text-muted transition-colors hover:bg-surface-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMoreTrigger />
        <span className="sr-only">{t('feed_story_menu_more_aria')}</span>
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          aria-orientation="vertical"
          className="absolute bottom-full end-0 z-50 mb-1 min-w-[15rem] list-none rounded-card border border-border bg-surface p-1 shadow-card"
        >
          {showOwnVariant ? (
            <>
              <MenuLinkRow
                icon={<IconPencil className="shrink-0" />}
                label={t('feed_story_menu_edit')}
                href={editHref}
                onNavigate={closeMenu}
              />
              <MenuRow
                icon={<IconPin className="shrink-0" />}
                label={t('feed_story_menu_pin')}
                disabled
                onActivate={() => undefined}
              />
              <MenuRow
                icon={<IconStarOutline className="shrink-0" />}
                label={t('feed_story_menu_bookmark')}
                disabled
                onActivate={() => undefined}
              />
              <MenuRow
                icon={<IconFacebook className="shrink-0 text-link" />}
                label={t('feed_story_menu_share_facebook')}
                disabled
                onActivate={() => undefined}
              />
              <MenuRow
                icon={<IconXLogo className="shrink-0" />}
                label={t('feed_story_menu_share_x')}
                disabled
                onActivate={() => undefined}
              />
            </>
          ) : (
            <>
              <MenuRow
                icon={<IconUnfollow className="shrink-0" />}
                label={`${t('feed_story_menu_unfollow')} @${authorName}`}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
              <MenuRow
                icon={<IconHide className="shrink-0" />}
                label={t('feed_story_menu_hide')}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
              <MenuRow
                icon={<IconMute className="shrink-0" />}
                label={`${t('feed_story_menu_mute')} @${authorName}`}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
              <MenuRow
                icon={<IconStarOutline className="shrink-0" />}
                label={t('feed_story_menu_bookmark')}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
              <MenuRow
                icon={<IconFlag className="shrink-0" />}
                label={t('feed_story_menu_flag')}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
              <MenuRow
                icon={<IconFacebook className="shrink-0 text-link" />}
                label={t('feed_story_menu_share_facebook')}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
              <MenuRow
                icon={<IconXLogo className="shrink-0" />}
                label={t('feed_story_menu_share_x')}
                disabled={loggedIn}
                onActivate={() =>
                  requireLoginOr(() => {
                    closeMenu();
                  })
                }
              />
            </>
          )}
        </ul>
      ) : null}
    </div>
  );
}
