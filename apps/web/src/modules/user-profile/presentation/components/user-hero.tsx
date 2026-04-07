'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import type { UserHeaderProps } from './user-header';
import { UserHeader } from './user-header';
import { UserMenuSkeleton } from './user-menu-skeleton';
import { UserProfileNavContext } from './user-profile-nav-context';

const UserMenuClient = dynamic(
  () => import('./user-menu').then((m) => ({ default: m.UserMenu })),
  { ssr: false, loading: () => <UserMenuSkeleton /> },
);

type UserHeroProps = UserHeaderProps & {
  pathname: string;
  search: string;
};

export function UserHero(props: UserHeroProps) {
  const { pathname, search, ...headerProps } = props;
  const navCtx = useMemo(
    () => ({ pathname, search }),
    [pathname, search],
  );

  return (
    <header className="overflow-hidden rounded-card border border-border bg-bg shadow-card">
      <UserHeader {...headerProps} />
      <div className="shell-hide-twitter px-gutter pb-3 sm:px-gutter-sm">
        <UserProfileNavContext.Provider value={navCtx}>
          <UserMenuClient
            accountName={headerProps.username}
            pathname={pathname}
            search={search}
          />
        </UserProfileNavContext.Provider>
      </div>
    </header>
  );
}
