import type { ReactNode } from 'react';

export type MasonryGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Multi-column masonry via CSS `columns`. Children should use `break-inside-avoid` where needed.
 */
export function MasonryGrid({ children, className = '' }: MasonryGridProps) {
  return (
    <div
      className={[
        'columns-1 sm:columns-2 lg:columns-3 [column-gap:var(--spacing-card)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
