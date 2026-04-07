import type { ReactNode } from 'react';

export type FixedRegionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Pins a column to the viewport inside a grid using sticky + full viewport height.
 * Prefer over `position: fixed` so the column stays in grid flow.
 */
export function FixedRegion({ children, className = '' }: FixedRegionProps) {
  return (
    <div
      className={[
        'sticky top-0 h-[100dvh] max-h-screen self-start overflow-y-auto',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
