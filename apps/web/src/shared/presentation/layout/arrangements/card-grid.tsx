import type { ReactNode } from 'react';

import {
  buildCardGridClassName,
  type CardGridColumns,
} from './card-grid-classname';

export type { CardGridColumns };

export type CardGridProps = {
  children: ReactNode;
  columns?: CardGridColumns;
  className?: string;
};

/**
 * Responsive CSS grid for card / media tiles. Uses token `gap-card-padding`.
 */
export function CardGrid({
  children,
  columns = { base: 1, sm: 2, lg: 3 },
  className = '',
}: CardGridProps) {
  return (
    <div className={buildCardGridClassName(columns, className)}>{children}</div>
  );
}
