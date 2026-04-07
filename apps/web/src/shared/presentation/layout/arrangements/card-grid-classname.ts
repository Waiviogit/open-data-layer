export type CardGridColumns = {
  base?: 1 | 2 | 3 | 4 | 5 | 6;
  sm?: 1 | 2 | 3 | 4 | 5 | 6;
  md?: 1 | 2 | 3 | 4 | 5 | 6;
  lg?: 1 | 2 | 3 | 4 | 5 | 6;
  xl?: 1 | 2 | 3 | 4 | 5 | 6;
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

/** Builds the responsive grid class string (exported for tests). */
export function buildCardGridClassName(
  columns: CardGridColumns = { base: 1, sm: 2, lg: 3 },
  className = '',
): string {
  const { base = 1, sm, md, lg, xl } = columns;
  return [
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
}
