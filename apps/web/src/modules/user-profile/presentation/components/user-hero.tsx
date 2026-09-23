'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { ShellFullBleedBand, ShellInset } from '@/shared/presentation/layout';
import { HIDDEN_ON_DESKTOP_CLASS, shouldHideHeroOnDesktop, useShellMode } from '@/shell-mode';

import type { UserHeaderProps } from './user-header';
import { UserHeader } from './user-header';
import { UserHeroCoverImage } from './user-hero-cover-image';
import { UserMenuSkeleton } from './user-menu-skeleton';
import { UserProfileNavContext } from './user-profile-nav-context';

const UserMenuClient = dynamic(
  () => import('./user-menu').then((m) => ({ default: m.UserMenu })),
  { ssr: false, loading: () => <UserMenuSkeleton rows="primary" /> },
);

type UserHeroProps = UserHeaderProps & {
  pathname: string;
  search: string;
};

export function UserHero(props: UserHeroProps) {
  const { pathname, search, ...headerProps } = props;
  const { resolvedMode } = useShellMode();
  const navCtx = useMemo(
    () => ({ pathname, search }),
    [pathname, search],
  );

  const hiddenOnDesktop = shouldHideHeroOnDesktop(resolvedMode);
  const hasCoverPhoto = Boolean(headerProps.hasCover && headerProps.coverImage);

  return (
    <header className={hiddenOnDesktop ? HIDDEN_ON_DESKTOP_CLASS : undefined}>
      <ShellFullBleedBand className="relative overflow-x-clip">
        <div
          className={[
            'overflow-hidden border-b border-border',
            hasCoverPhoto
              ? 'absolute inset-0 bg-surface'
              : 'absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-accent/30 to-surface',
          ].join(' ')}
          aria-hidden={!headerProps.hasCover}
        >
          {hasCoverPhoto && headerProps.coverImage ? (
            <>
              <UserHeroCoverImage
                coverImageUrl={headerProps.coverImage}
                priority={!hiddenOnDesktop}
              />
              <div className="profile-cover-scrim absolute inset-0" aria-hidden />
            </>
          ) : null}
        </div>
        <ShellInset
          className={
            hasCoverPhoto
              ? 'relative z-10 flex min-h-[15rem] flex-col justify-end pt-8'
              : 'relative z-10 pt-36'
          }
        >
          <UserHeader {...headerProps} />
        </ShellInset>
      </ShellFullBleedBand>
      <ShellFullBleedBand className="bg-surface shadow-card">
        <ShellInset className="pt-0">
          <div
            className={[
              'shell-profile-grid grid grid-cols-1',
              'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
            ].join(' ')}
          >
            <div className="min-w-0 lg:col-start-2">
              <UserProfileNavContext.Provider value={navCtx}>
                <UserMenuClient accountName={headerProps.username} rows="primary" />
              </UserProfileNavContext.Provider>
            </div>
          </div>
        </ShellInset>
      </ShellFullBleedBand>
    </header>
  );
}
