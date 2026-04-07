import type { ReactNode } from 'react';

export type CardGridColumns = {
  base?: 1 | 2 | 3 | 4 | 5 | 6;
  sm?: 1 | 2 | 3 | 4 | 5 | 6;
  md?: 1 | 2 | 3 | 4 | 5 | 6;
  lg?: 1 | 2 | 3 | 4 | 5 | 6;
  xl?: 1 | 2 | 3 | 4 | 5 | 6;
};

export type CardGridProps = {
  children: ReactNode;
  columns?: CardGridColumns;
  className?: string;
};

const COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

function colClass(n: number | undefined, prefix: string): string {
  if (n === undefined) {
    return '';
  }
  const c = COLS[n] ?? COLS[1];
  return prefix ? `${prefix}:${c}` : c;
}

/**
 * Responsive CSS grid for card / media tiles. Uses token `gap-card-padding`.
 */
export function CardGrid({
  children,
  columns = { base: 1, sm: 2, lg: 3 },
  className = '',
}: CardGridProps) {
  const { base = 1, sm, md, lg, xl } = columns;
  const classes = [
    'grid gap-card-padding',
    colClass(base, ''),
    colClass(sm, 'sm'),
    colClass(md, 'md'),
    colClass(lg, 'lg'),
    colClass(xl, 'xl'),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
}
