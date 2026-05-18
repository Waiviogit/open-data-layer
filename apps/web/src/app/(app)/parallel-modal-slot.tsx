'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';

type ParallelModalSlotProps = {
  children: React.ReactNode;
};

/**
 * Keys the `@modal` parallel slot so soft navigations that change the intercepted segment remount.
 * Overlay dismissal while on `/object/…` lives in {@link PostInterceptModalShell} (pathname can lag).
 */
export function ParallelModalSlot({ children }: ParallelModalSlotProps) {
  const pathnameKey = usePathname();

  return <Fragment key={pathnameKey}>{children}</Fragment>;
}
