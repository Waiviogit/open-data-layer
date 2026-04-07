import type { ReactNode } from 'react';

export type StickyRegionProps = {
  children: ReactNode;
  /** CSS length for `top` (e.g. `var(--shell-header-height)` or `0`). */
  offset?: string;
  className?: string;
};

/**
 * Sticky aside / rail wrapper. Main scroll stays on the document unless a parent uses overflow.
 */
export function StickyRegion({
  children,
  offset = '0',
  className = '',
}: StickyRegionProps) {
  return (
    <div
      className={['self-start', className].join(' ')}
      style={{ position: 'sticky', top: offset }}
    >
      {children}
    </div>
  );
}
