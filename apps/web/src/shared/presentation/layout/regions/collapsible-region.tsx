'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';

export type CollapsibleRegionProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  /** When set, persists open state in `localStorage`. */
  storageKey?: string;
  label?: string;
  className?: string;
};

function readStoredOpen(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Client region with expand/collapse. Optional persistence via `storageKey`.
 */
export function CollapsibleRegion({
  children,
  defaultOpen = true,
  storageKey,
  label = 'Toggle section',
  className = '',
}: CollapsibleRegionProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    setOpen(readStoredOpen(storageKey, defaultOpen));
  }, [storageKey, defaultOpen]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, String(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [storageKey]);

  return (
    <div className={className}>
      <button
        type="button"
        className="mb-2 w-full rounded-btn border border-border bg-surface px-3 py-2 text-left text-caption text-fg hover:bg-surface-alt lg:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        {label}
      </button>
      <div id={id} className={[open ? 'block' : 'hidden', 'lg:block'].join(' ')}>
        {children}
      </div>
    </div>
  );
}
