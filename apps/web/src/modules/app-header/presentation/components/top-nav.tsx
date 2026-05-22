'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { AppHeaderUser } from '../../domain/app-header-user';
import {
  buildSearchFlatList,
  pickDefaultSearchFilterTab,
} from '../../domain/search-nav-list';
import type { SearchFilterTab } from '../../domain/search-nav-list';
import { fetchSearchCounts, fetchSearchResults } from '../../infrastructure/search.client';
import type { SearchCountsResponse, SearchResponse } from '../../domain/search-response.schema';
import { HeaderActions } from './header-actions';
import { EMPTY_RESULTS, SearchDropdown } from './search-dropdown';

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

export function TopNav({ user: _user }: TopNavProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const countsAbortRef = useRef<AbortController | null>(null);

  const [searchBarActive, setSearchBarActive] = useState(false);
  const [searchBarValue, setSearchBarValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncePending, setDebouncePending] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCounts, setSearchCounts] = useState<SearchCountsResponse | null>(null);
  const [searchCountsLoading, setSearchCountsLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<SearchFilterTab>('product');
  const [activeIndex, setActiveIndex] = useState(0);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearDebounce();
      fetchAbortRef.current?.abort();
      countsAbortRef.current?.abort();
    };
  }, [clearDebounce]);

  useEffect(() => {
    setSearchBarValue('');
    setDebouncedQuery('');
    setDropdownOpen(false);
    setSearchBarActive(false);
    setDebouncePending(false);
    setSearchResults(null);
    setSearchLoading(false);
    setSearchCounts(null);
    setSearchCountsLoading(false);
    setFilterTab('product');
    setActiveIndex(0);
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

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchCounts(null);
      setSearchCountsLoading(false);
      return;
    }

    fetchAbortRef.current?.abort();
    countsAbortRef.current?.abort();

    const mainAc = new AbortController();
    const countsAc = new AbortController();
    fetchAbortRef.current = mainAc;
    countsAbortRef.current = countsAc;

    setSearchResults(null);
    setSearchLoading(true);
    setSearchCounts(null);
    setSearchCountsLoading(true);

    void (async () => {
      try {
        const data = await fetchSearchResults(q, { signal: mainAc.signal });
        if (mainAc.signal.aborted) {
          return;
        }
        setSearchResults(data);
        const types = [...new Set(data.objects.map((o) => o.object_type))];
        const defaultTab =
          types.length > 0
            ? types.sort((a, b) => a.localeCompare(b))[0]
            : data.users.length > 0
              ? 'users'
              : 'product';
        setFilterTab(defaultTab);
        setActiveIndex(0);
      } catch {
        if (!mainAc.signal.aborted) {
          setSearchResults(null);
        }
      } finally {
        if (!mainAc.signal.aborted) {
          setSearchLoading(false);
        }
      }
    })();

    void (async () => {
      try {
        const countData = await fetchSearchCounts(q, { signal: countsAc.signal });
        if (countsAc.signal.aborted) {
          return;
        }
        setSearchCounts(countData);
        setFilterTab((prev) => {
          if (prev !== 'users' && countData.type_counts[prev] != null) {
            return prev;
          }
          return pickDefaultSearchFilterTab(countData.type_counts, countData.total_users);
        });
      } catch {
        if (!countsAc.signal.aborted) {
          setSearchCounts(null);
        }
      } finally {
        if (!countsAc.signal.aborted) {
          setSearchCountsLoading(false);
        }
      }
    })();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const el = searchShellRef.current;
      if (el && !el.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [dropdownOpen]);

  const flatList = useMemo(
    () => (searchResults ? buildSearchFlatList(searchResults, filterTab) : []),
    [searchResults, filterTab],
  );

  useEffect(() => {
    if (flatList.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((i) => Math.min(i, flatList.length - 1));
  }, [flatList.length, filterTab, searchResults]);

  const activeQuery = debouncedQuery.trim();
  const showDropdown = dropdownOpen && (Boolean(activeQuery) || debouncePending);
  const panelResultsLoading =
    debouncePending || (searchLoading && searchResults === null);
  const panelCountsLoading = searchCountsLoading;

  function onInputChange(v: string) {
    setSearchBarValue(v);
    setDropdownOpen(true);
    if (!v.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchCounts(null);
      setSearchCountsLoading(false);
    }
  }

  function closeDropdown() {
    setDropdownOpen(false);
  }

  function activateHighlighted() {
    const entry = flatList[activeIndex];
    if (!entry) {
      return;
    }
    closeDropdown();
    if (entry.kind === 'object') {
      router.push(`/object/${encodeURIComponent(entry.item.object_id)}`);
    } else {
      router.push(`/@${encodeURIComponent(entry.item.name)}`);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      if (searchBarActive) {
        setSearchBarActive(false);
      }
      return;
    }

    if (!showDropdown || panelResultsLoading || !searchResults) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatList.length === 0) {
        return;
      }
      setActiveIndex((i) => (i + 1) % flatList.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatList.length === 0) {
        return;
      }
      setActiveIndex((i) => (i - 1 + flatList.length) % flatList.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      activateHighlighted();
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
        ref={searchShellRef}
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
                setSearchResults(null);
                setSearchCounts(null);
                setSearchCountsLoading(false);
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
            role="presentation"
            className="absolute start-0 top-full z-50 mt-1 w-full rounded-card border border-border bg-surface p-0 shadow-card"
          >
            {activeQuery || debouncePending ? (
              <SearchDropdown
                results={searchResults ?? EMPTY_RESULTS}
                resultsLoading={panelResultsLoading}
                counts={searchCounts}
                countsLoading={panelCountsLoading}
                filterTab={filterTab}
                onFilterTabChange={(tab) => {
                  setFilterTab(tab);
                  setActiveIndex(0);
                }}
                activeIndex={activeIndex}
                flatList={flatList}
                onHighlightIndex={setActiveIndex}
                listId={listId}
                searchQuery={activeQuery}
                onClose={closeDropdown}
                messages={{
                  sectionObjects: t('search_section_objects'),
                  sectionUsers: t('search_section_users'),
                  empty: t('search_empty_state'),
                  loading: t('app_header_search_loading'),
                  tabUsers: t('search_tab_users'),
                  following: t('search_user_following'),
                }}
              />
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
          <HeaderActions user={_user} />
        ) : null}
        {hideActionsWhileMobileSearch ? (
          <div className="hidden items-center gap-2 lg:flex">
            <HeaderActions user={_user} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
