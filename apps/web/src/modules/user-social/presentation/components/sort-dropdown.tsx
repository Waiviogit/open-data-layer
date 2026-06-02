'use client';

import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

export type SortOption<T extends string> = {
  value: T;
  label: string;
};

export type SortDropdownProps<T extends string> = {
  value: T;
  options: SortOption<T>[];
  onChange: (next: T) => void;
};

export function SortDropdown<T extends string>({ value, options, onChange }: SortDropdownProps<T>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-body-sm text-fg-secondary hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="hidden sm:inline">{t('social_sort_by')}&nbsp;</span>
        <span className="font-weight-label text-fg">{currentLabel}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`ml-0.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('social_sort_by')}
          className="absolute right-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`cursor-pointer px-4 py-2.5 text-body-sm transition-colors hover:bg-surface-alt ${
                o.value === value ? 'font-weight-label text-fg' : 'text-fg-secondary'
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
