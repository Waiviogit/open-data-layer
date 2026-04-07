import type { ReactNode } from 'react';

export type PublicShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Marketing / auth-style shell: centered narrow column, no app sidebars.
 */
export function PublicShell({ children, className = '' }: PublicShellProps) {
  return (
    <div
      className={[
        'mx-auto min-h-screen max-w-container-narrow px-gutter py-section-y-sm sm:px-gutter-sm',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
