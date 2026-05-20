'use client';

import Image from 'next/image';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { shouldUnoptimizeRemoteImage, UserAvatar } from '@/shared/presentation';

import type { UserProfileShellUser } from './types';

function IconBell({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className={filled ? 'text-accent' : 'text-current'}
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export type UserHeaderProps = {
  user: UserProfileShellUser;
  username: string;
  isSameUser: boolean;
  isGuest: boolean;
  isFollowing: boolean;
  isBell: boolean;
  hasCover: boolean;
  coverImage: string | null;
  isHeroLoading: boolean;
  onFollowClick: () => void;
  onBellToggle: () => void;
  followPending?: boolean;
};

export function UserHeader({
  user,
  username,
  isSameUser,
  isGuest,
  isFollowing,
  isBell,
  hasCover,
  coverImage,
  isHeroLoading,
  onFollowClick,
  onBellToggle,
  followPending = false,
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
            unoptimized={shouldUnoptimizeRemoteImage(coverImage)}
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

        <div className="flex flex-wrap items-center gap-2 sm:pb-1">
          {!isHeroLoading && !isSameUser && !isGuest ? (
            <>
              <button
                type="button"
                onClick={onFollowClick}
                disabled={followPending}
                className={[
                  'group rounded-btn px-4 py-2 text-sm font-medium disabled:opacity-50',
                  isFollowing
                    ? 'border border-border bg-surface-control text-muted hover:border-red-400 hover:bg-red-500/10 hover:text-red-600'
                    : 'bg-accent text-accent-fg hover:opacity-90',
                ].join(' ')}
              >
                <span className={isFollowing ? 'group-hover:hidden' : ''}>
                  {isFollowing ? t('following') : t('follow')}
                </span>
                {isFollowing ? (
                  <span className="hidden group-hover:inline">{t('unfollow')}</span>
                ) : null}
              </button>
              {isFollowing ? (
                <button
                  type="button"
                  onClick={onBellToggle}
                  className="rounded-btn border border-border bg-bg p-2 text-fg hover:bg-muted"
                  aria-pressed={isBell}
                  title={isBell ? t('user_hero_bell_on') : t('user_hero_bell_off')}
                  aria-label={isBell ? t('user_hero_bell_on') : t('user_hero_bell_off')}
                >
                  <IconBell filled={isBell} />
                </button>
              ) : null}
            </>
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
