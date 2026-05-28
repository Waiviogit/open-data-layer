'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

import type { AddFieldOptions } from '../../domain/add-field-options';

export type AddFieldPopoverProps = {
  candidateTypes: readonly string[];
  onAddField: (updateType: string, options?: AddFieldOptions) => void;
  disabled?: boolean;
};

export function AddFieldPopover({
  candidateTypes,
  onAddField,
  disabled = false,
}: AddFieldPopoverProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...candidateTypes];
    }
    return candidateTypes.filter((type) => {
      const label = labelForUpdateType(type).toLowerCase();
      const def = UPDATE_REGISTRY[type];
      const desc = (def?.description ?? '').toLowerCase();
      return (
        type.toLowerCase().includes(q) ||
        label.includes(q) ||
        desc.includes(q)
      );
    });
  }, [candidateTypes, query]);

  const selectType = useCallback(
    (type: string) => {
      onAddField(type);
      setOpen(false);
      setQuery('');
      setHighlight(0);
    },
    [onAddField],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setHighlight(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (candidateTypes.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative mt-4 border-t border-border pt-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="text-body-sm font-medium text-accent hover:underline disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        + {t('object_create_add_field')}
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-lg"
          role="listbox"
        >
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="search"
              className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-body-sm text-fg placeholder:text-muted"
              placeholder={t('object_create_add_field_search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, filtered.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === 'Enter' && filtered[highlight]) {
                  e.preventDefault();
                  selectType(filtered[highlight]);
                }
              }}
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-body-sm text-muted">
                {t('object_create_type_no_match')}
              </li>
            ) : (
              filtered.map((type, index) => {
                const def = UPDATE_REGISTRY[type];
                return (
                  <li key={type}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlight}
                      className={[
                        'w-full px-3 py-2 text-left text-body-sm',
                        index === highlight
                          ? 'bg-accent/10 text-fg'
                          : 'text-fg hover:bg-ghost-surface',
                      ].join(' ')}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => selectType(type)}
                    >
                      <span className="font-medium">
                        {labelForUpdateType(type)}
                      </span>
                      {def?.description ? (
                        <span className="mt-0.5 block text-caption text-muted">
                          {def.description}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
