'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { AppHeaderUser } from '../../domain/app-header-user';
import { HeaderActions } from './header-actions';

const SEARCH_DEBOUNCE_MS = 300;

export type TopNavProps = {
  user: AppHeaderUser | null;
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function TopNav({ user }: TopNavProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchBarActive, setSearchBarActive] = useState(false);
  const [searchBarValue, setSearchBarValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncePending, setDebouncePending] = useState(false);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearDebounce();
    };
  }, [clearDebounce]);

  useEffect(() => {
    setSearchBarValue('');
    setDebouncedQuery('');
    setDropdownOpen(false);
    setSearchBarActive(false);
    setDebouncePending(false);
  }, [pathname]);

  useEffect(() => {
    if (searchBarActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchBarActive]);

  useEffect(() => {
    clearDebounce();
    const q = searchBarValue.trim();
    if (!q) {
      setDebouncePending(false);
      setDebouncedQuery('');
      return;
    }
    setDebouncePending(true);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(q);
      setDebouncePending(false);
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  }, [searchBarValue, clearDebounce]);

  const showDropdown =
    dropdownOpen && (Boolean(debouncedQuery) || debouncePending);

  function onInputChange(v: string) {
    setSearchBarValue(v);
    setDropdownOpen(true);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      if (searchBarActive) {
        setSearchBarActive(false);
      }
    }
  }

  function toggleMobileSearch() {
    setSearchBarActive((a) => {
      const next = !a;
      if (!next) {
        setDropdownOpen(false);
      }
      return next;
    });
  }

  const hideActionsWhileMobileSearch = searchBarActive;

  return (
    <div className="flex min-h-shell-header flex-wrap items-center gap-2 px-gutter py-2 sm:px-gutter-sm lg:flex-nowrap">
      <div
        className={[
          'flex min-w-0 shrink-0 items-center',
          hideActionsWhileMobileSearch ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        <Link
          href="/"
          className="app-header-brand-link"
          aria-label={t('app_header_brand_aria')}
          // Wallet extensions (e.g. Keychain) inject classes on anchors before hydration completes.
          suppressHydrationWarning
        >
          <span aria-hidden className="rounded-btn bg-accent px-2 py-1 text-caption text-accent-fg">
            ODL
          </span>
          <span className="max-w-[8rem] truncate sm:max-w-none">{t('app_header_brand_text')}</span>
        </Link>
      </div>

      <div
        className={[
          'relative min-w-0 flex-1',
          !searchBarActive ? 'hidden lg:block' : 'block',
        ].join(' ')}
      >
        <div className="relative flex w-full items-center gap-2 rounded-btn border border-border bg-surface-control px-3 py-1.5">
          <SearchIcon className="shrink-0 text-fg-secondary" />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            autoComplete="off"
            value={searchBarValue}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              window.setTimeout(() => setDropdownOpen(false), 120);
            }}
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? `${listId}-panel` : undefined}
            aria-autocomplete="list"
            placeholder={t('search_placeholder')}
            className="min-w-0 flex-1 border-0 bg-transparent text-body text-fg outline-none placeholder:text-fg-tertiary"
          />
          {searchBarValue ? (
            <button
              type="button"
              className="shrink-0 rounded-btn px-1.5 py-0.5 text-caption text-fg-secondary hover:bg-ghost-surface hover:text-fg"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchBarValue('');
                setDebouncedQuery('');
                setDropdownOpen(false);
              }}
            >
              {t('close')}
            </button>
          ) : null}
        </div>
        {showDropdown ? (
          <div
            id={`${listId}-panel`}
            role="listbox"
            className="absolute start-0 top-full z-50 mt-1 w-full rounded-card border border-border bg-surface p-3 shadow-card"
          >
            {debouncePending ? (
              <p className="text-body-sm text-fg-secondary">{t('app_header_search_loading')}</p>
            ) : debouncedQuery ? (
              <p className="text-body-sm text-fg-secondary">{t('app_header_search_mvp_hint')}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-2 lg:ms-0">
        <button
          type="button"
          className="rounded-btn p-2 text-fg-secondary hover:bg-ghost-surface hover:text-fg lg:hidden"
          onClick={toggleMobileSearch}
          aria-expanded={searchBarActive}
          aria-label={
            searchBarActive
              ? t('app_header_close_search_aria')
              : t('app_header_open_search_aria')
          }
        >
          {searchBarActive ? <CloseIcon /> : <SearchIcon />}
        </button>
        {!hideActionsWhileMobileSearch ? (
          <HeaderActions user={user} />
        ) : null}
        {hideActionsWhileMobileSearch ? (
          <div className="hidden items-center gap-2 lg:flex">
            <HeaderActions user={user} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
