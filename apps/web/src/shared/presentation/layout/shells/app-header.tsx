import type { ReactNode } from 'react';

export type AppHeaderProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Placeholder for global app header (search, nav). Extend when product chrome is defined.
 */
export function AppHeader({ children, className = '' }: AppHeaderProps) {
  if (children) {
    return (
      <header
        className={['border-b border-border bg-nav-bg', className].join(' ')}
        style={{ backdropFilter: 'var(--backdrop-nav)' }}
      >
        {children}
      </header>
    );
  }
  return (
    <header
      className={['min-h-shell-header border-b border-border bg-nav-bg', className].join(' ')}
      aria-hidden
    />
  );
}
