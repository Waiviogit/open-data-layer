'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { fetchSearchResults } from '@/modules/app-header/infrastructure/search.client';
import type { SearchObjectResult } from '@/modules/app-header/domain/search-response.schema';
import { formatObjectTypeLabel } from '@/modules/app-header/domain/search-nav-list';
import { useI18n } from '@/i18n/providers/i18n-provider';

const SEARCH_DEBOUNCE_MS = 300;
const DROPDOWN_MAX_HEIGHT_PX = 192;
const DROPDOWN_MIN_HEIGHT_PX = 80;
const DROPDOWN_GAP_PX = 4;
/** Above add-update modal (`z-[100]`). */
const DROPDOWN_Z_INDEX = 110;

export type ObjectRefSearchFieldProps = {
  /** Selected referenced object id (stored as `value_text` in ODL `update_create`). */
  value: string;
  onChange: (objectId: string, result?: SearchObjectResult) => void;
  label?: string;
  /** When set, only search results with matching `object_type` are shown. */
  appliesTo?: readonly string[];
};

type DropdownRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function filterByAppliesTo(
  results: SearchObjectResult[],
  appliesTo?: readonly string[],
): SearchObjectResult[] {
  if (!appliesTo?.length) {
    return results;
  }
  const allowed = new Set(appliesTo);
  return results.filter((r) => allowed.has(r.object_type));
}

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

function ObjectRefSearchResultsList({
  results,
  onSelect,
}: {
  results: SearchObjectResult[];
  onSelect: (result: SearchObjectResult) => void;
}) {
  return (
    <>
      {results.map((result) => {
        const title = result.name?.trim() || result.object_id;
        const img = result.image_url;
        return (
          <li key={result.object_id}>
            <button
              type="button"
              role="option"
              className="flex w-full items-center gap-2 px-2 py-2 text-start hover:bg-ghost-surface"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(result)}
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-control">
                {img ? (
                  <img
                    src={img}
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
                <span className="block truncate font-medium text-fg">{title}</span>
                {result.parent_name ? (
                  <span className="block truncate text-body-sm text-muted">
                    {result.parent_name}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 rounded-sm bg-surface-control px-1.5 py-0.5 text-caption text-muted">
                {formatObjectTypeLabel(result.object_type)}
              </span>
            </button>
          </li>
        );
      })}
    </>
  );
}

export function ObjectRefSearchField({
  value,
  onChange,
  label,
  appliesTo,
}: ObjectRefSearchFieldProps) {
  const { t } = useI18n();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectId = value.trim();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchObjectResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedObject, setSelectedObject] = useState<SearchObjectResult | null>(
    null,
  );
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!objectId) {
      setSelectedObject(null);
      return;
    }
    if (selectedObject?.object_id === objectId) {
      return;
    }
    setSelectedObject({
      object_id: objectId,
      object_type: '',
      name: objectId,
      image_url: null,
      parent_name: null,
    });
  }, [objectId, selectedObject?.object_id]);

  useEffect(() => {
    if (objectId) {
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
      void fetchSearchResults(q, { signal: controller.signal }).then((res) => {
        if (controller.signal.aborted) {
          return;
        }
        setSearchResults(filterByAppliesTo(res?.objects ?? [], appliesTo));
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery, objectId, appliesTo]);

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

  function onSelectObject(result: SearchObjectResult) {
    setSelectedObject(result);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownRect(null);
    onChange(result.object_id, result);
  }

  function onClearObject() {
    setSelectedObject(null);
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
            <ObjectRefSearchResultsList
              results={searchResults}
              onSelect={onSelectObject}
            />
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={label ? 'text-sm' : 'text-sm mt-0'}>
      {label ? <span className="font-medium text-fg">{label}</span> : null}
      {selectedObject && objectId ? (
        <div className="relative mt-2 flex items-start gap-2 rounded-btn border border-border bg-bg p-2">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
            {selectedObject.image_url ? (
              <img
                src={selectedObject.image_url}
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
              {selectedObject.name?.trim() || selectedObject.object_id}
            </span>
            {selectedObject.parent_name ? (
              <span className="block truncate text-body-sm text-muted">
                {selectedObject.parent_name}
              </span>
            ) : null}
            {selectedObject.object_type ? (
              <span className="mt-1 inline-block rounded-sm bg-surface px-1.5 py-0.5 text-caption text-muted">
                {formatObjectTypeLabel(selectedObject.object_type)}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={onClearObject}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-fg hover:bg-surface-alt"
            aria-label={t('object_edit_menu_item_clear_object')}
            title={t('object_edit_menu_item_clear_object')}
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
            placeholder={t('object_edit_menu_item_search_placeholder')}
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
