'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { isRefValueExcluded } from '@/modules/object-create/domain/duplicate-ref-field-values';
import { formatDuplicateRefMessage } from '@/modules/object-create/domain/format-duplicate-ref-message';
import {
  fetchSearchObjectById,
  fetchObjectSearchResults,
} from '@/modules/app-header/infrastructure/search.client';
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
  /** Object ids already used in sibling rows (shown in search, not selectable). */
  excludeObjectIds?: readonly string[];
  /** Update type id for duplicate messages (e.g. `parent`). */
  updateType?: string;
  /** Translated field name for duplicate messages when `label` is hidden. */
  fieldLabel?: string;
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

function ObjectRefSearchResultsList({
  results,
  excludeObjectIds,
  duplicateHint,
  onSelect,
  onSelectDuplicate,
}: {
  results: SearchObjectResult[];
  excludeObjectIds: readonly string[];
  duplicateHint?: string | null;
  onSelect: (result: SearchObjectResult) => void;
  onSelectDuplicate: (result: SearchObjectResult) => void;
}) {
  return (
    <>
      {results.map((result) => {
        const title = result.name?.trim() || result.object_id;
        const img = result.image_url;
        const isDuplicate = isRefValueExcluded(
          'object_ref',
          result.object_id,
          excludeObjectIds,
        );
        return (
          <li key={result.object_id}>
            <button
              type="button"
              role="option"
              aria-disabled={isDuplicate}
              className={[
                'flex w-full items-center gap-2 px-2 py-2 text-start',
                isDuplicate
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-ghost-surface',
              ].join(' ')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                isDuplicate ? onSelectDuplicate(result) : onSelect(result)
              }
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
                <span className="block truncate font-weight-label text-fg">{title}</span>
                {isDuplicate && duplicateHint ? (
                  <span className="block truncate text-body-sm text-warning">
                    {duplicateHint}
                  </span>
                ) : result.parent_name ? (
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
  excludeObjectIds = [],
  updateType = '',
  fieldLabel: fieldLabelProp,
}: ObjectRefSearchFieldProps) {
  const { t } = useI18n();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipResolveForPickerRef = useRef<string | null>(null);
  const objectId = value.trim();
  const fieldLabel = fieldLabelProp?.trim() ?? label?.trim() ?? updateType;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchObjectResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedObject, setSelectedObject] = useState<SearchObjectResult | null>(
    null,
  );
  const [resolvingObject, setResolvingObject] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [duplicateAlertFromList, setDuplicateAlertFromList] = useState<
    string | null
  >(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!objectId) {
      setSelectedObject(null);
      setResolvingObject(false);
      return;
    }
    if (skipResolveForPickerRef.current === objectId) {
      skipResolveForPickerRef.current = null;
      return;
    }

    const controller = new AbortController();
    setResolvingObject(true);
    void fetchSearchObjectById(objectId, {
      signal: controller.signal,
      appliesTo,
    }).then((result) => {
      if (controller.signal.aborted) {
        return;
      }
      setSelectedObject(
        result ?? {
          object_id: objectId,
          object_type: '',
          name: objectId,
          image_url: null,
          parent_name: null,
        },
      );
      setResolvingObject(false);
    });

    return () => {
      controller.abort();
    };
  }, [objectId, appliesTo]);

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
      void fetchObjectSearchResults(q, {
        signal: controller.signal,
        appliesTo,
      }).then((objects) => {
        if (controller.signal.aborted) {
          return;
        }
        setSearchResults(objects ?? []);
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery, objectId, appliesTo]);

  const showDropdown =
    searchQuery.trim().length >= 2 && searchResults.length > 0 && !searching;

  const searchDuplicateAlert = useMemo(() => {
    if (objectId) {
      return null;
    }
    const duplicateFor = (id: string): string | null => {
      if (!isRefValueExcluded('object_ref', id, excludeObjectIds)) {
        return null;
      }
      return formatDuplicateRefMessage(t, updateType, fieldLabel, id);
    };

    const q = searchQuery.trim();
    if (q.length > 0) {
      const direct = duplicateFor(q);
      if (direct) {
        return direct;
      }
    }
    return null;
  }, [objectId, searchQuery, excludeObjectIds, updateType, fieldLabel, t]);

  const duplicateAlert = duplicateAlertFromList ?? searchDuplicateAlert;

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

  function onSelectDuplicateObject(result: SearchObjectResult) {
    setDuplicateAlertFromList(
      formatDuplicateRefMessage(t, updateType, fieldLabel, result.object_id),
    );
  }

  function onSelectObject(result: SearchObjectResult) {
    setDuplicateAlertFromList(null);
    skipResolveForPickerRef.current = result.object_id;
    setSelectedObject(result);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownRect(null);
    onChange(result.object_id, result);
  }

  function onClearObject() {
    setSelectedObject(null);
    setSearchQuery('');
    setDuplicateAlertFromList(null);
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
              excludeObjectIds={excludeObjectIds}
              duplicateHint={duplicateAlert}
              onSelect={onSelectObject}
              onSelectDuplicate={onSelectDuplicateObject}
            />
            {duplicateAlert ? (
              <li
                className="border-t border-border px-2 py-2 text-caption text-warning"
                role="alert"
              >
                {duplicateAlert}
              </li>
            ) : null}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={label ? 'text-body-sm' : 'text-body-sm mt-0'}>
      {label ? <span className="font-weight-label text-fg">{label}</span> : null}
      {selectedObject && objectId ? (
        <div className="relative mt-2 flex items-start gap-2 rounded-btn border border-border bg-bg p-2">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
            {resolvingObject ? (
              <span className="flex h-full w-full animate-pulse items-center justify-center bg-surface-control text-caption text-muted">
                …
              </span>
            ) : selectedObject.image_url ? (
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
            <span
              className={[
                'block truncate font-weight-label',
                resolvingObject ? 'text-muted' : 'text-fg',
              ].join(' ')}
            >
              {resolvingObject
                ? t('object_edit_menu_item_searching')
                : selectedObject.name?.trim() || selectedObject.object_id}
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
          {duplicateAlert && !showDropdown ? (
            <p className="mb-2 text-caption text-warning" role="alert">
              {duplicateAlert}
            </p>
          ) : null}
          <input
            ref={inputRef}
            type="search"
            className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
            placeholder={t('object_edit_menu_item_search_placeholder')}
            value={searchQuery}
            onChange={(e) => {
              setDuplicateAlertFromList(null);
              setSearchQuery(e.target.value);
            }}
            autoComplete="off"
            aria-controls={showDropdown ? listId : undefined}
            aria-expanded={showDropdown}
          />
          {searching ? (
            <p className="mt-1 text-caption text-muted">
              {t('object_edit_menu_item_searching')}
            </p>
          ) : null}
          {searchQuery.trim().length >= 2 &&
          !searching &&
          searchResults.length === 0 &&
          !duplicateAlert ? (
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
