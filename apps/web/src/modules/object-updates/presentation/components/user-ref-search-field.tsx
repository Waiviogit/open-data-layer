'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { fetchUserSearchResults } from '@/modules/app-header/infrastructure/search.client';
import type { SearchUserResult } from '@/modules/app-header/domain/search-response.schema';
import { useI18n } from '@/i18n/providers/i18n-provider';

const SEARCH_DEBOUNCE_MS = 300;
const DROPDOWN_MAX_HEIGHT_PX = 192;
const DROPDOWN_MIN_HEIGHT_PX = 80;
const DROPDOWN_GAP_PX = 4;
/** Above add-update modal (`z-[100]`). */
const DROPDOWN_Z_INDEX = 110;

export type UserRefSearchFieldProps = {
  /** Hive account name stored as update value. */
  value: string;
  onChange: (accountName: string, result?: SearchUserResult) => void;
  label?: string;
};

type DropdownRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function measureDropdownRect(input: HTMLInputElement): DropdownRect {
  const rect = input.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP_PX;
  const spaceAbove = rect.top - DROPDOWN_GAP_PX;
  const openBelow =
    spaceBelow >= DROPDOWN_MIN_HEIGHT_PX || spaceBelow >= spaceAbove;

  if (openBelow) {
    const maxHeight = Math.min(
      DROPDOWN_MAX_HEIGHT_PX,
      Math.max(DROPDOWN_MIN_HEIGHT_PX, spaceBelow),
    );
    return {
      top: rect.bottom + DROPDOWN_GAP_PX,
      left: rect.left,
      width: rect.width,
      maxHeight,
    };
  }

  const maxHeight = Math.min(
    DROPDOWN_MAX_HEIGHT_PX,
    Math.max(DROPDOWN_MIN_HEIGHT_PX, spaceAbove),
  );
  return {
    top: Math.max(DROPDOWN_GAP_PX, rect.top - DROPDOWN_GAP_PX - maxHeight),
    left: rect.left,
    width: rect.width,
    maxHeight,
  };
}

function UserRefSearchResultsList({
  results,
  onSelect,
}: {
  results: SearchUserResult[];
  onSelect: (result: SearchUserResult) => void;
}) {
  return (
    <>
      {results.map((user) => (
        <li key={user.name}>
          <button
            type="button"
            role="option"
            className="flex w-full items-center gap-2 px-2 py-2 text-start hover:bg-ghost-surface"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(user)}
          >
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-control">
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt=""
                  className="h-10 w-10 object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-caption text-muted">
                  —
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-fg">{user.name}</span>
              <span className="block truncate text-body-sm text-muted">
                {user.reputation.toFixed(2)} · {user.followers_count}
              </span>
            </span>
          </button>
        </li>
      ))}
    </>
  );
}

export function UserRefSearchField({
  value,
  onChange,
  label,
}: UserRefSearchFieldProps) {
  const { t } = useI18n();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const accountName = value.trim();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!accountName) {
      setSelectedUser(null);
      return;
    }
    if (selectedUser?.name === accountName) {
      return;
    }
    setSelectedUser({
      name: accountName,
      profile_image: null,
      reputation: 0,
      followers_count: 0,
      is_following: false,
    });
  }, [accountName, selectedUser?.name]);

  useEffect(() => {
    if (accountName) {
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      void fetchUserSearchResults(q, { signal: controller.signal }).then((users) => {
        if (controller.signal.aborted) {
          return;
        }
        setSearchResults(users ?? []);
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery, accountName]);

  const showDropdown = searchResults.length > 0;

  useLayoutEffect(() => {
    if (!showDropdown) {
      setDropdownRect(null);
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const update = () => {
      setDropdownRect(measureDropdownRect(input));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showDropdown, searchQuery, searchResults.length]);

  function onSelectUser(result: SearchUserResult) {
    setSelectedUser(result);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownRect(null);
    onChange(result.name, result);
  }

  function onClearUser() {
    setSelectedUser(null);
    setSearchQuery('');
    onChange('');
  }

  const dropdown =
    portalReady &&
    showDropdown &&
    dropdownRect &&
    typeof document !== 'undefined'
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            className="fixed overflow-y-auto rounded-btn border border-border bg-surface shadow-card-float"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              maxHeight: dropdownRect.maxHeight,
              zIndex: DROPDOWN_Z_INDEX,
            }}
          >
            <UserRefSearchResultsList
              results={searchResults}
              onSelect={onSelectUser}
            />
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={label ? 'text-sm' : 'text-sm mt-0'}>
      {label ? <span className="font-medium text-fg">{label}</span> : null}
      {selectedUser && accountName ? (
        <div className="relative mt-2 flex items-start gap-2 rounded-btn border border-border bg-bg p-2">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
            {selectedUser.profile_image ? (
              <img
                src={selectedUser.profile_image}
                alt=""
                className="h-10 w-10 object-cover"
                loading="lazy"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-caption text-muted">
                —
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1 pr-8">
            <span className="block truncate font-medium text-fg">
              {selectedUser.name}
            </span>
            {selectedUser.reputation > 0 || selectedUser.followers_count > 0 ? (
              <span className="block truncate text-body-sm text-muted">
                {selectedUser.reputation.toFixed(2)} · {selectedUser.followers_count}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={onClearUser}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-fg hover:bg-surface-alt"
            aria-label={t('object_edit_delegation_clear_user')}
            title={t('object_edit_delegation_clear_user')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <input
            ref={inputRef}
            type="search"
            className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
            placeholder={t('object_edit_delegation_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            aria-controls={showDropdown ? listId : undefined}
            aria-expanded={showDropdown}
          />
          {searching ? (
            <p className="mt-1 text-caption text-muted">
              {t('object_edit_menu_item_searching')}
            </p>
          ) : null}
          {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 ? (
            <p className="mt-1 text-caption text-muted">
              {t('object_edit_menu_item_no_results')}
            </p>
          ) : null}
          {dropdown}
        </div>
      )}
    </div>
  );
}
