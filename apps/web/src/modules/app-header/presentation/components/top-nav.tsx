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

import { APP_HEADER_BRAND_LOGO } from '@/config/app-brand';
import { CloseIcon, SearchIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';

import type { AppHeaderUser } from '../../domain/app-header-user';
import { buildSearchFlatList } from '../../domain/search-nav-list';
import { resolveSearchEnterTarget } from '../../domain/resolve-search-enter-target';
import { fetchSearchCounts, fetchSearchResults } from '../../infrastructure/search.client';
import type { SearchCountsResponse, SearchResponse } from '../../domain/search-response.schema';
import { readDiscoverObjectTypeCookie } from '@/modules/discover/domain/discover-type-cookie';
import { resolveDiscoverSearchType } from '@/modules/discover/domain/resolve-discover-search-type';
import { HeaderActions } from './header-actions';
import { EMPTY_RESULTS, SearchDropdown } from './search-dropdown';

const SEARCH_DEBOUNCE_MS = 300;

export type TopNavProps = {
  user: AppHeaderUser | null;
  messagesUnreadCount?: number;
};

export function TopNav({ user: _user, messagesUnreadCount = 0 }: TopNavProps) {
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [highlightTouched, setHighlightTouched] = useState(false);

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
    setActiveIndex(0);
    setHighlightTouched(false);
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
    setActiveIndex(0);
    setHighlightTouched(false);

    void (async () => {
      try {
        const data = await fetchSearchResults(q, { signal: mainAc.signal });
        if (mainAc.signal.aborted) {
          return;
        }
        if (!data) {
          setSearchResults(null);
          setActiveIndex(0);
          return;
        }
        setSearchResults(data);
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
        if (!countData) {
          setSearchCounts(null);
          return;
        }
        setSearchCounts(countData);
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
    () => (searchResults ? buildSearchFlatList(searchResults) : []),
    [searchResults],
  );

  useEffect(() => {
    if (flatList.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((i) => Math.min(i, flatList.length - 1));
  }, [flatList.length, searchResults]);

  const activeQuery = debouncedQuery.trim();
  const showDropdown = dropdownOpen && (Boolean(activeQuery) || debouncePending);
  const panelResultsLoading =
    debouncePending || (searchLoading && searchResults === null);
  const panelCountsLoading = searchCountsLoading;

  function clearSearchQueryState() {
    clearDebounce();
    fetchAbortRef.current?.abort();
    countsAbortRef.current?.abort();
    setSearchBarValue('');
    setDebouncedQuery('');
    setDebouncePending(false);
    setSearchResults(null);
    setSearchLoading(false);
    setSearchCounts(null);
    setSearchCountsLoading(false);
    setActiveIndex(0);
    setHighlightTouched(false);
  }

  function clearSearch() {
    clearSearchQueryState();
    inputRef.current?.focus();
  }

  function closeSearch() {
    clearSearchQueryState();
    setDropdownOpen(false);
    setSearchBarActive(false);
    inputRef.current?.blur();
  }

  function onInputChange(v: string) {
    setSearchBarActive(true);
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
    const selectedType = resolveDiscoverSearchType({
      pathname,
      search: typeof window !== 'undefined' ? window.location.search : '',
      rememberedCookie: readDiscoverObjectTypeCookie(),
    });

    const target = resolveSearchEnterTarget({
      highlightTouched,
      highlighted: flatList[activeIndex] ?? null,
      selectedType,
      query: activeQuery,
      users: searchResults?.users.map((u) => u.name) ?? [],
      resultsLoading: panelResultsLoading,
    });

    if (!target) {
      return;
    }

    closeDropdown();
    router.push(target.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      activateHighlighted();
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
      setHighlightTouched(true);
      setActiveIndex((i) => (i + 1) % flatList.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatList.length === 0) {
        return;
      }
      setHighlightTouched(true);
      setActiveIndex((i) => (i - 1 + flatList.length) % flatList.length);
      return;
    }
  }

  function toggleMobileSearch() {
    if (searchBarActive) {
      closeSearch();
      return;
    }
    setSearchBarActive(true);
  }

  const hideActionsWhileMobileSearch = searchBarActive;

  return (
    <div className="flex min-h-shell-header flex-nowrap items-center gap-1 py-2 sm:gap-2">
      <div
        className={[
          'flex min-w-0 shrink items-center me-2 sm:me-4 lg:me-6',
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
          <img
            src={APP_HEADER_BRAND_LOGO.src}
            width={APP_HEADER_BRAND_LOGO.width}
            height={APP_HEADER_BRAND_LOGO.height}
            alt=""
            aria-hidden
            className="h-7 w-auto max-w-[7.5rem] shrink sm:h-8 sm:max-w-[9rem] lg:max-w-[10rem]"
          />
        </Link>
      </div>

      <div
        ref={searchShellRef}
        className={[
          'app-header-search-surface relative min-w-0 flex-1',
          !searchBarActive ? 'hidden lg:block' : 'block',
        ].join(' ')}
      >
        <div
          className="relative flex w-full items-center gap-2 rounded-btn border border-border bg-surface px-3 py-1.5"
          // Password managers and extensions often mutate search fields before hydration.
          suppressHydrationWarning
        >
          <SearchIcon size={20} className="shrink-0 text-fg-secondary" />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            autoComplete="off"
            suppressHydrationWarning
            value={searchBarValue}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => {
              setSearchBarActive(true);
              setDropdownOpen(true);
            }}
            onKeyDown={onKeyDown}
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? `${listId}-panel` : undefined}
            aria-autocomplete="list"
            placeholder={t('search_placeholder')}
            className="min-w-0 flex-1 border-0 bg-transparent text-body text-fg outline-none placeholder:text-fg-tertiary [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {searchBarValue ? (
            <button
              type="button"
              className="shrink-0 rounded-btn px-1.5 py-0.5 text-caption text-link hover:text-fg"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSearch}
            >
              {t('app_header_clear_search')}
            </button>
          ) : null}
          {searchBarValue ? (
            <span
              className="hidden h-4 w-px shrink-0 bg-border lg:block"
              aria-hidden
            />
          ) : null}
          {searchBarActive ? (
            <button
              type="button"
              className="hidden shrink-0 rounded-btn p-0.5 text-fg hover:bg-ghost-surface lg:inline-flex"
              onMouseDown={(e) => e.preventDefault()}
              onClick={closeSearch}
              aria-label={t('app_header_close_search_aria')}
            >
              <CloseIcon size={20} />
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
                activeIndex={activeIndex}
                flatList={flatList}
                onHighlightIndex={(index) => {
                  setHighlightTouched(true);
                  setActiveIndex(index);
                }}
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
                  discoverChipsAria: t('search_discover_chips_aria'),
                  userExpertiseTooltip: t('stat_user_expertise_tooltip'),
                  userFollowersTooltip: t('stat_user_followers_tooltip'),
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="ms-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2 lg:ms-0">
        <button
          type="button"
          className="rounded-btn p-2 text-nav-fg hover:bg-white/10 lg:hidden"
          onClick={toggleMobileSearch}
          aria-expanded={searchBarActive}
          aria-label={
            searchBarActive
              ? t('app_header_close_search_aria')
              : t('app_header_open_search_aria')
          }
        >
          {searchBarActive ? <CloseIcon size={20} /> : <SearchIcon size={20} />}
        </button>
        {!hideActionsWhileMobileSearch ? (
          <HeaderActions user={_user} messagesUnreadCount={messagesUnreadCount} />
        ) : null}
        {hideActionsWhileMobileSearch ? (
          <div className="hidden items-center gap-2 lg:flex">
            <HeaderActions user={_user} messagesUnreadCount={messagesUnreadCount} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
