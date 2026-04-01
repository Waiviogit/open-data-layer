'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import type { UserProfileShellUser } from './types';

export type UserHeaderProps = {
  user: UserProfileShellUser;
  username: string;
  isSameUser: boolean;
  isGuest: boolean;
  hasCover: boolean;
  coverImage: string | null;
  isHeroLoading: boolean;
  onTransferClick: () => void;
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
  onTransferClick,
  onFollowClick,
}: UserHeaderProps) {
  const { t } = useI18n();
  const initials = user.displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <div
        className={[
          'h-36 w-full overflow-hidden rounded-t-lg border-b border-border bg-surface',
          hasCover && coverImage ? '' : 'bg-gradient-to-br from-accent/30 to-surface',
        ].join(' ')}
        aria-hidden={!hasCover}
      >
        {hasCover && coverImage ? (
          <img src={coverImage} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="relative -mt-12 flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:px-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-bg bg-bg text-lg font-semibold text-fg shadow-sm">
          {isHeroLoading ? (
            <span className="h-8 w-8 animate-pulse rounded-full bg-surface" />
          ) : (
            <span aria-label={user.displayName}>{initials}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          {isHeroLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-surface" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded bg-surface" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-fg">{user.displayName}</h1>
                <span className="text-sm text-muted">@{username}</span>
                {isGuest ? (
                  <span className="rounded bg-surface px-2 py-0.5 text-xs capitalize text-muted">
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
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              {t('follow')}
            </button>
          ) : null}
          {!isHeroLoading && isSameUser ? (
            <button
              type="button"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
            >
              {t('edit_profile')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onTransferClick}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
          >
            {t('transfer')}
          </button>
        </div>
      </div>
    </div>
  );
}
