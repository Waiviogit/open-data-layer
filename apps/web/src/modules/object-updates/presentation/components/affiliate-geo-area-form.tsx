'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  AFFILIATE_GEO_LABELS,
  affiliateGeoSelectOptions,
  VALID_AFFILIATE_GEO,
  type ValidAffiliateGeo,
} from '@opden-data-layer/core/constants';

import { ChevronDownIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { Z_INDEX_DROPDOWN_ABOVE_MODAL } from '@/modules/map/constants/map-stack';

const GEO_SET = new Set<string>(VALID_AFFILIATE_GEO);
const OPTIONS = affiliateGeoSelectOptions();
const DROPDOWN_GAP_PX = 8;
const DROPDOWN_MIN_HEIGHT_PX = 160;
const VIEWPORT_INSET_PX = 16;

export type AffiliateGeoAreaFormProps = {
  value: unknown;
  onChange: (value: string) => void;
};

type DropdownRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function asGeo(value: unknown): ValidAffiliateGeo {
  return typeof value === 'string' && GEO_SET.has(value)
    ? (value as ValidAffiliateGeo)
    : 'GLOBAL';
}

function optionClassName(active: boolean): string {
  return [
    'cursor-pointer px-3 py-2 text-body-sm transition-colors',
    active
      ? 'bg-accent-soft font-weight-label text-accent'
      : 'text-fg hover:bg-accent-soft',
  ].join(' ');
}

function measureDropdownRect(trigger: HTMLElement): DropdownRect {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP_PX - VIEWPORT_INSET_PX;
  const spaceAbove = rect.top - DROPDOWN_GAP_PX - VIEWPORT_INSET_PX;
  const openBelow =
    spaceBelow >= DROPDOWN_MIN_HEIGHT_PX || spaceBelow >= spaceAbove;
  const available = openBelow ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(DROPDOWN_MIN_HEIGHT_PX, available);

  return {
    top: openBelow
      ? rect.bottom + DROPDOWN_GAP_PX
      : Math.max(VIEWPORT_INSET_PX, rect.top - DROPDOWN_GAP_PX - maxHeight),
    left: rect.left,
    width: rect.width,
    maxHeight,
  };
}

export function AffiliateGeoAreaForm({ value, onChange }: AffiliateGeoAreaFormProps) {
  const { t } = useI18n();
  const selected = asGeo(value);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [portalReady, setPortalReady] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return OPTIONS;
    }
    return OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    searchRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownRect(null);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const update = () => setDropdownRect(measureDropdownRect(trigger));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleOutside(e: MouseEvent) {
      const node = e.target as Node;
      if (
        containerRef.current?.contains(node) ||
        menuRef.current?.contains(node)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const menu =
    portalReady && open && dropdownRect && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-card-float"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              height: dropdownRect.maxHeight,
              maxHeight: dropdownRect.maxHeight,
              zIndex: Z_INDEX_DROPDOWN_ABOVE_MODAL,
            }}
          >
            <input
              ref={searchRef}
              type="search"
              className="w-full shrink-0 border-b border-border bg-transparent px-3 py-2 text-body-sm text-fg outline-none placeholder:text-muted"
              value={query}
              placeholder={t('search')}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
            />
            <ul
              id={listId}
              role="listbox"
              aria-label={t('object_field_affiliateGeoArea')}
              className="min-h-0 flex-1 overflow-y-auto scrollbar-minimal"
            >
              {filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === selected}
                  className={optionClassName(opt.value === selected)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="block">
      <span className="text-muted">{t('object_field_affiliateGeoArea')}</span>
      <div className="relative mt-1">
        <button
          ref={triggerRef}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-btn border border-border bg-bg px-3 py-2 text-start text-fg hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="truncate">{AFFILIATE_GEO_LABELS[selected]}</span>
          <ChevronDownIcon
            size={12}
            className={`shrink-0 text-fg-secondary transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {menu}
      </div>
    </div>
  );
}
