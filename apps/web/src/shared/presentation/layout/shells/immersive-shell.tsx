import type { ReactNode } from 'react';

export type ImmersiveShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Full-viewport content with no page chrome (compose, media viewer).
 */
export function ImmersiveShell({ children, className = '' }: ImmersiveShellProps) {
  return (
    <div className={['min-h-screen min-w-0', className].join(' ')}>{children}</div>
  );
}
