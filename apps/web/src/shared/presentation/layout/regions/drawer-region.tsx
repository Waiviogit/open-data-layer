'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

export type DrawerRegionProps = {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  /** Accessible label for the dialog. */
  ariaLabel: string;
  className?: string;
};

/**
 * Fixed overlay drawer for small screens. Backdrop click closes.
 */
export function DrawerRegion({
  open,
  onClose,
  side = 'left',
  children,
  ariaLabel,
  className = '',
}: DrawerRegionProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const position =
    side === 'left'
      ? 'left-0 border-r border-border'
      : 'right-0 border-l border-border';

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-overlay"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={[
          'absolute top-0 h-full w-[min(100%,var(--shell-left-width))] max-w-[90vw] overflow-y-auto bg-bg shadow-card-float',
          position,
          className,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </aside>
    </div>
  );
}
