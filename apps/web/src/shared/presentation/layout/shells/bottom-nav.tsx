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
          'app-header-blur fixed inset-x-0 bottom-0 z-30 border-t border-border lg:hidden',
          className,
        ].join(' ')}
        aria-label="Primary"
      >
        {children}
      </nav>
    );
  }
  return null;
}
