'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import type { UserProfileShellUser } from './types';
import { UserHero } from './user-hero';

const HERO_FETCH_MS = 450;

export type UserProfileHeroClientProps = {
  accountName: string;
  initialUser: UserProfileShellUser;
};

/**
 * Client boundary for profile hero: pathname/search for nav + hero loading affordance.
 */
export function UserProfileHeroClient({
  accountName,
  initialUser,
}: UserProfileHeroClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [isHeroLoading, setIsHeroLoading] = useState(true);

  useEffect(() => {
    setIsHeroLoading(true);
    const t = window.setTimeout(() => {
      setIsHeroLoading(false);
    }, HERO_FETCH_MS);
    return () => window.clearTimeout(t);
  }, [accountName]);

  const onFollowClick = useCallback(() => {
    /* wire to follow action */
  }, []);

  const hasCover = Boolean(initialUser.coverImageUrl);
  const coverImage = initialUser.coverImageUrl;

  return (
    <UserHero
      user={initialUser}
      username={accountName}
      isSameUser={false}
      isGuest={false}
      hasCover={hasCover}
      coverImage={coverImage}
      isHeroLoading={isHeroLoading}
      onFollowClick={onFollowClick}
      pathname={pathname}
      search={search}
    />
  );
}
