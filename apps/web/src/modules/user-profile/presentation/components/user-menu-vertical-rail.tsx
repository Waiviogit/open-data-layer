'use client';

import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

const UserMenuClient = dynamic(
  () => import('./user-menu').then((m) => ({ default: m.UserMenu })),
  {
    ssr: false,
    loading: () => <UserMenuVerticalRailSkeleton />,
  },
);

type UserMenuVerticalRailProps = {
  accountName: string;
};

/**
 * Skeleton for the vertical rail menu (no pathname — avoids SSR/client mismatch).
 */
function UserMenuVerticalRailSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <nav
        className="flex flex-col gap-0.5"
        aria-label={t('user_profile_nav_aria')}
        aria-busy="true"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full min-w-0 animate-pulse rounded-btn bg-surface"
          />
        ))}
      </nav>
    </div>
  );
}

/**
 * Client boundary for rendering UserMenu vertically in the left rail.
 * Reads pathname/search from Next.js hooks for active-link state.
 * UserMenu is client-only (dynamic ssr: false), matching UserHero — avoids
 * hydration mismatches from pathname/search during SSR vs first client render.
 */
export function UserMenuVerticalRail({ accountName }: UserMenuVerticalRailProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const menuProps = useMemo(
    () => ({
      accountName,
      pathname,
      search,
      direction: 'vertical' as const,
    }),
    [accountName, pathname, search],
  );

  return (
    <div className="rounded-card border border-border bg-bg p-2 shadow-card">
      <UserMenuClient {...menuProps} />
    </div>
  );
}
