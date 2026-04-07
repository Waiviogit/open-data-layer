import type { ReactNode } from 'react';

export type BottomNavProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Placeholder for mobile bottom navigation. Extend when product chrome is defined.
 */
export function BottomNav({ children, className = '' }: BottomNavProps) {
  if (children) {
    return (
      <nav
        className={[
          'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-nav-bg lg:hidden',
          className,
        ].join(' ')}
        style={{ backdropFilter: 'var(--backdrop-nav)' }}
        aria-label="Primary"
      >
        {children}
      </nav>
    );
  }
  return null;
}
