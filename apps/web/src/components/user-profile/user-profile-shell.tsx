'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { getSegmentsAfterAccount } from './profile-path';
import type { UserProfileShellUser } from './types';
import { LeftSidebar } from './left-sidebar';
import { RightSidebar } from './right-sidebar';
import { UserHero } from './user-hero';

const HERO_FETCH_MS = 450;

type UserProfileShellProps = {
  accountName: string;
  initialUser: UserProfileShellUser;
  children: React.ReactNode;
};

export function UserProfileShell({
  accountName,
  initialUser,
  children,
}: UserProfileShellProps) {
  const pathname = usePathname();
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    setLayoutReady(true);
  }, []);

  const rest = layoutReady ? getSegmentsAfterAccount(pathname) : null;

  const isAboutPage = rest !== null && rest[0] === 'about';
  const isMapPage = rest !== null && rest[0] === 'map';
  const isWalletTableOpen =
    rest !== null && rest[0] === 'transfers' && rest[1] === 'waiv-table';

  const showLeftSidebar =
    rest === null ? true : !isAboutPage && !isMapPage && !isWalletTableOpen;
  const showRightSidebar = rest === null ? true : !isMapPage && !isWalletTableOpen;
  const gridClass =
    showLeftSidebar && showRightSidebar
      ? 'lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,14rem)]'
      : !showLeftSidebar && showRightSidebar
        ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]'
        : 'lg:grid-cols-1';

  useEffect(() => {
    setIsHeroLoading(true);
    const t = window.setTimeout(() => {
      setIsHeroLoading(false);
    }, HERO_FETCH_MS);
    return () => window.clearTimeout(t);
  }, [accountName]);

  const onTransferClick = useCallback(() => {
    /* wire to openTransfer / wallet modals */
  }, []);

  const onFollowClick = useCallback(() => {
    /* wire to follow action */
  }, []);

  const hasCover = Boolean(initialUser.coverImageUrl);
  const coverImage = initialUser.coverImageUrl;

  return (
    <div className="mx-auto max-w-container-page px-gutter py-section-y-sm sm:px-gutter-sm">
      <UserHero
        user={initialUser}
        username={accountName}
        isSameUser={false}
        isGuest={false}
        hasCover={hasCover}
        coverImage={coverImage}
        isHeroLoading={isHeroLoading}
        onTransferClick={onTransferClick}
        onFollowClick={onFollowClick}
        pathname={pathname}
      />

      <div className={['mt-card-padding grid grid-cols-1 gap-card-padding', gridClass].join(' ')}>
        {showLeftSidebar ? (
          <div className="hidden lg:block">
            <LeftSidebar />
          </div>
        ) : null}

        <main className="min-h-[12rem] min-w-0">{children}</main>

        {showRightSidebar ? (
          <div className="hidden lg:block">
            <RightSidebar accountName={accountName} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
