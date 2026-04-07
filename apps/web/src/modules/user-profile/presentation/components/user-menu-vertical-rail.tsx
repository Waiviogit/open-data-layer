'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { UserMenu } from './user-menu';

type UserMenuVerticalRailProps = {
  accountName: string;
};

/**
 * Client boundary for rendering UserMenu vertically in the left rail.
 * Reads pathname/search from Next.js hooks for active-link state.
 */
export function UserMenuVerticalRail({ accountName }: UserMenuVerticalRailProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  return (
    <div className="rounded-card border border-border bg-bg p-2 shadow-card">
      <UserMenu
        accountName={accountName}
        pathname={pathname}
        search={search}
        direction="vertical"
      />
    </div>
  );
}
