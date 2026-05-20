'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useLoginModal } from '@/modules/auth/presentation';
import {
  broadcastUserFollowBell,
  broadcastUserFollowToggle,
} from '@/modules/user-social/infrastructure/broadcast-user-subscription';

import type { UserProfileShellUser } from './types';
import { UserHero } from './user-hero';

const HERO_FETCH_MS = 450;

export type UserProfileHeroClientProps = {
  accountName: string;
  initialUser: UserProfileShellUser;
  viewerUsername: string | null;
};

/**
 * Client boundary for profile hero: pathname/search for nav + hero loading affordance.
 */
export function UserProfileHeroClient({
  accountName,
  initialUser,
  viewerUsername,
}: UserProfileHeroClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const router = useRouter();
  const { openLogin } = useLoginModal();
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(initialUser.isFollowing);
  const [viewerBell, setViewerBell] = useState(initialUser.viewerBell);
  const [followPending, setFollowPending] = useState(false);
  const [bellPending, setBellPending] = useState(false);

  useEffect(() => {
    setIsFollowing(initialUser.isFollowing);
    setViewerBell(initialUser.viewerBell);
  }, [initialUser.isFollowing, initialUser.viewerBell]);

  useEffect(() => {
    setIsHeroLoading(true);
    const t = window.setTimeout(() => {
      setIsHeroLoading(false);
    }, HERO_FETCH_MS);
    return () => window.clearTimeout(t);
  }, [accountName]);

  const isSameUser =
    viewerUsername != null && viewerUsername.toLowerCase() === accountName.toLowerCase();
  const isGuest = viewerUsername == null;

  const onFollowClick = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (followPending || isSameUser) {
      return;
    }
    const previousFollowing = isFollowing;
    const previousBell = viewerBell;
    setIsFollowing(!previousFollowing);
    if (previousFollowing) {
      setViewerBell(false);
    }
    setFollowPending(true);
    try {
      await broadcastUserFollowToggle(account, accountName, previousFollowing);
      router.refresh();
    } catch {
      setIsFollowing(previousFollowing);
      setViewerBell(previousBell);
    } finally {
      setFollowPending(false);
    }
  }, [
    accountName,
    followPending,
    isFollowing,
    isSameUser,
    openLogin,
    router,
    viewerBell,
    viewerUsername,
  ]);

  const onBellToggle = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      openLogin();
      return;
    }
    if (bellPending || !isFollowing) {
      return;
    }
    const previousBell = viewerBell;
    const nextBell = !viewerBell;
    setViewerBell(nextBell);
    setBellPending(true);
    try {
      await broadcastUserFollowBell(account, accountName, nextBell);
      router.refresh();
    } catch {
      setViewerBell(previousBell);
    } finally {
      setBellPending(false);
    }
  }, [
    accountName,
    bellPending,
    isFollowing,
    openLogin,
    router,
    viewerBell,
    viewerUsername,
  ]);

  const hasCover = Boolean(initialUser.coverImageUrl);
  const coverImage = initialUser.coverImageUrl;

  return (
    <UserHero
      user={initialUser}
      username={accountName}
      isSameUser={isSameUser}
      isGuest={isGuest}
      isFollowing={isFollowing}
      isBell={viewerBell}
      hasCover={hasCover}
      coverImage={coverImage}
      isHeroLoading={isHeroLoading}
      onFollowClick={onFollowClick}
      onBellToggle={onBellToggle}
      followPending={followPending}
      pathname={pathname}
      search={search}
    />
  );
}
