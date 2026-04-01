'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

/**
 * Placeholder shown while UserMenu loads (client-only to avoid pathname SSR mismatch).
 */
export function UserMenuSkeleton() {
  const { t } = useI18n();

  return (
    <nav
      className="flex flex-wrap gap-1 border-t border-border pt-3"
      aria-label={t('user_profile_nav_aria')}
      aria-busy="true"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="inline-flex h-9 min-w-[4.5rem] animate-pulse rounded-md bg-surface px-3 py-2"
        />
      ))}
    </nav>
  );
}
