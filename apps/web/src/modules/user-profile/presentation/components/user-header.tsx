'use client';

import Image from 'next/image';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { UserAvatar } from '@/shared/presentation';

import type { UserProfileShellUser } from './types';

export type UserHeaderProps = {
  user: UserProfileShellUser;
  username: string;
  isSameUser: boolean;
  isGuest: boolean;
  hasCover: boolean;
  coverImage: string | null;
  isHeroLoading: boolean;
  onFollowClick: () => void;
};

export function UserHeader({
  user,
  username,
  isSameUser,
  isGuest,
  hasCover,
  coverImage,
  isHeroLoading,
  onFollowClick,
}: UserHeaderProps) {
  const { t } = useI18n();
  const hasCoverPhoto = Boolean(hasCover && coverImage);

  return (
    <div className="relative">
      <div
        className={[
          'relative h-36 w-full overflow-hidden rounded-t-card border-b border-border bg-surface',
          hasCover && coverImage ? '' : 'bg-gradient-to-br from-accent/30 to-surface',
        ].join(' ')}
        aria-hidden={!hasCover}
      >
        {hasCover && coverImage ? (
          <Image
            src={coverImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="relative -mt-12 flex flex-col gap-4 px-gutter pb-4 sm:flex-row sm:items-end sm:px-gutter-sm">
        {isHeroLoading ? (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-bg bg-bg shadow-card">
            <span className="h-8 w-8 animate-pulse rounded-full bg-surface" />
          </div>
        ) : (
          <UserAvatar
            username={username}
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            size={96}
            className="text-lg font-semibold"
          />
        )}

        <div className="min-w-0 flex-1 pb-1">
          {isHeroLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded-btn bg-surface" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded-btn bg-surface" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={[
                    'truncate text-2xl font-semibold',
                    hasCoverPhoto
                      ? 'text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85),0_0_12px_rgba(0,0,0,0.35)]'
                      : 'text-fg',
                  ].join(' ')}
                >
                  {user.displayName}
                </h1>
                <span
                  className={[
                    'text-sm',
                    hasCoverPhoto
                      ? 'text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]'
                      : 'text-muted',
                  ].join(' ')}
                >
                  @{username}
                </span>
                {isGuest ? (
                  <span className="rounded-btn bg-surface px-2 py-0.5 text-xs capitalize text-muted">
                    {t('guest')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{user.bio}</p>
              <p className="mt-2 text-xs text-muted">
                {user.followerCount} {t('followers')} · {user.followingCount} {t('following')} ·{' '}
                {user.postingCount} {t('posts')}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:pb-1">
          {!isHeroLoading && !isSameUser && !isGuest ? (
            <button
              type="button"
              onClick={onFollowClick}
              className="rounded-btn bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              {t('follow')}
            </button>
          ) : null}
          {!isHeroLoading && isSameUser ? (
            <button
              type="button"
              className="rounded-btn border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
            >
              {t('edit_profile')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
