'use client';

import dynamic from 'next/dynamic';

import { useEffectiveProfileNav } from './user-profile-pending-nav-context';
import { getSubmenuVariant } from './user-profile-subnav';
import { UserMenuSkeleton } from './user-menu-skeleton';

const UserMenuClient = dynamic(
  () => import('./user-menu').then((m) => ({ default: m.UserMenu })),
  { ssr: false, loading: () => <UserMenuSkeleton rows="submenu" /> },
);

export type UserProfileSubmenuProps = {
  accountName: string;
};

/**
 * Center-column sub-tabs (profile main layout), parity with object Reviews
 * {@link ObjectPrimaryContent} + {@link ObjectFeedSubNav}.
 */
export function UserProfileSubmenu({
  accountName,
}: UserProfileSubmenuProps) {
  const { pathname } = useEffectiveProfileNav();
  const variant = pathname ? getSubmenuVariant(pathname) : null;

  if (!variant) {
    return null;
  }

  return (
    <div className="rounded-card border border-border bg-bg px-card-padding pt-2">
      <UserMenuClient accountName={accountName} rows="submenu" />
    </div>
  );
}
