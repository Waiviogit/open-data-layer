import type { ReactNode } from 'react';

export type FeedColumnProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Single-column vertical flow for feeds and lists (`gap-card-padding`).
 */
export function FeedColumn({ children, className = '' }: FeedColumnProps) {
  return (
    <div className={['flex flex-col gap-card-padding', className].join(' ')}>
      {children}
    </div>
  );
}
