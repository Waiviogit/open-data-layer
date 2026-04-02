'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { getSubmenuVariant } from './user-profile-subnav';
import { useUserProfileNav } from './user-profile-nav-context';

/**
 * Placeholder shown while UserMenu loads (client-only to avoid pathname SSR mismatch).
 */
export function UserMenuSkeleton() {
  const { t } = useI18n();
  const { pathname } = useUserProfileNav();
  const showSubRow = Boolean(pathname && getSubmenuVariant(pathname));

  return (
    <div className="space-y-0">
      <nav
        className="flex flex-wrap gap-1 border-t border-border pt-3"
        aria-label={t('user_profile_nav_aria')}
        aria-busy="true"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="inline-flex h-9 min-w-[4.5rem] animate-pulse rounded-btn bg-surface px-3 py-2"
          />
        ))}
      </nav>
      {showSubRow ? (
        <nav
          className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2"
          aria-hidden="true"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="inline-flex h-7 min-w-[3.5rem] animate-pulse rounded-btn bg-surface/90 px-2.5 py-1.5"
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
