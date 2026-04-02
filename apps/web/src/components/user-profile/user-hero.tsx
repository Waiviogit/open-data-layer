'use client';

import dynamic from 'next/dynamic';

import type { UserHeaderProps } from './user-header';
import { UserHeader } from './user-header';
import { UserMenuSkeleton } from './user-menu-skeleton';

const UserMenuClient = dynamic(
  () => import('./user-menu').then((m) => ({ default: m.UserMenu })),
  { ssr: false, loading: () => <UserMenuSkeleton /> },
);

type UserHeroProps = UserHeaderProps & {
  pathname: string;
};

export function UserHero(props: UserHeroProps) {
  const { pathname, ...headerProps } = props;

  return (
    <header className="overflow-hidden rounded-card border border-border bg-bg shadow-card">
      <UserHeader {...headerProps} />
      <div className="px-gutter pb-3 sm:px-gutter-sm">
        <UserMenuClient accountName={headerProps.username} pathname={pathname} />
      </div>
    </header>
  );
}
