'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { BellIcon } from '@/icons';
import { StatHoverTooltip, UserAvatar } from '@/shared/presentation';

import type { UserAccountSidebarView } from '../../domain/types/user-account-sidebar-view';
import type { UserProfileShellUser } from './types';
import { UserProfileMobileHeroDetails } from './user-profile-mobile-hero-details';
import { UserProfileMobileHeroMeta } from './user-profile-mobile-hero-meta';

export type UserHeaderProps = {
  user: UserProfileShellUser;
  username: string;
  sidebar: UserAccountSidebarView | null;
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
  sidebar,
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
  const hiveReputation = sidebar?.hive.reputation;

  return (
    <div
      className={[
        'relative flex flex-col items-center gap-4 pb-4 text-center lg:flex-row lg:items-end lg:text-left',
        hasCoverPhoto ? '' : '-mt-12',
      ].join(' ')}
    >
      {isHeroLoading ? (
        <div className="flex h-24 w-24 shrink-0 self-center items-center justify-center rounded-circle border-4 border-bg bg-bg shadow-card lg:self-start">
          <span className="h-8 w-8 animate-pulse rounded-circle bg-surface" />
        </div>
      ) : (
        <div className="shrink-0 self-center lg:self-start">
          <UserAvatar
            username={username}
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            size={96}
            className="text-body-lg font-weight-strong font-display"
          />
        </div>
      )}

      <div className="min-w-0 flex-1 pb-1">
        {isHeroLoading ? (
          <div className="space-y-2">
            <div className="mx-auto h-6 w-48 animate-pulse rounded-btn bg-surface lg:mx-0" />
            <div className="mx-auto h-4 w-72 max-w-full animate-pulse rounded-btn bg-surface lg:mx-0" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <h1
                className={[
                  'truncate text-section font-weight-strong font-display',
                  hasCoverPhoto ? 'hero-on-photo-title' : 'text-fg',
                ].join(' ')}
              >
                {user.displayName}
              </h1>
              {hiveReputation != null ? (
                <StatHoverTooltip content={t('steem_reputation')}>
                  <span className="rounded-btn border border-border bg-surface-control px-2 py-0.5 font-mono text-body-sm tabular-nums text-fg">
                    {hiveReputation.toFixed(2)}
                  </span>
                </StatHoverTooltip>
              ) : null}
              <span
                className={[
                  'text-body-sm',
                  hasCoverPhoto ? 'hero-on-photo-muted' : 'text-muted',
                ].join(' ')}
              >
                @{username}
              </span>
              {isGuest ? (
                <span className="rounded-btn bg-surface px-2 py-0.5 text-caption capitalize text-muted">
                  {t('guest')}
                </span>
              ) : null}
            </div>
            {sidebar ? (
              <UserProfileMobileHeroMeta sidebar={sidebar} onCover={hasCoverPhoto} />
            ) : isHeroLoading ? (
              <UserProfileMobileHeroMeta sidebar={LOADING_SIDEBAR_PLACEHOLDER} isLoading />
            ) : null}
            <p
              className={[
                'mt-2 hidden text-caption lg:block',
                hasCoverPhoto ? 'hero-on-photo-muted' : 'text-muted',
              ].join(' ')}
            >
              <StatHoverTooltip content={t('stat_user_followers_tooltip')}>
                <span>
                  {user.followerCount} {t('followers')}
                </span>
              </StatHoverTooltip>
              {' · '}
              {user.followingCount} {t('following')} · {user.postingCount} {t('posts')}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end lg:pb-1">
        {!isHeroLoading && !isSameUser && !isGuest ? (
          <>
            <button
              type="button"
              onClick={onFollowClick}
              disabled={followPending}
              className={[
                'group rounded-btn px-4 py-2 text-body-sm font-weight-label disabled:opacity-50',
                isFollowing
                  ? 'hero-follow-active'
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
                className={[
                  'rounded-btn p-2',
                  hasCoverPhoto
                    ? 'hero-on-photo-btn'
                    : 'border border-border bg-bg text-fg hover:bg-muted',
                ].join(' ')}
                aria-pressed={isBell}
                title={isBell ? t('user_hero_bell_on') : t('user_hero_bell_off')}
                aria-label={isBell ? t('user_hero_bell_on') : t('user_hero_bell_off')}
              >
                <BellIcon
                  size={22}
                  className={isBell ? 'fill-accent text-accent' : 'text-current'}
                />
              </button>
            ) : null}
          </>
        ) : null}
        {!isHeroLoading && isSameUser ? (
          <button
            type="button"
            className={[
              'rounded-btn px-4 py-2 text-body-sm font-weight-label',
              hasCoverPhoto
                ? 'hero-on-photo-btn'
                : 'border border-border text-fg hover:bg-surface',
            ].join(' ')}
          >
            {t('edit_profile')}
          </button>
        ) : null}
      </div>

      {sidebar ? (
        <UserProfileMobileHeroDetails
          bio={user.bio}
          sidebar={sidebar}
          onCover={hasCoverPhoto}
        />
      ) : isHeroLoading ? (
        <UserProfileMobileHeroDetails
          bio={user.bio}
          sidebar={LOADING_SIDEBAR_PLACEHOLDER}
          isLoading
        />
      ) : null}
    </div>
  );
}

const LOADING_SIDEBAR_PLACEHOLDER: UserAccountSidebarView = {
  about: '',
  location: null,
  website: null,
  email: null,
  joinedAt: null,
  expertiseWeight: 0,
  lastActivityAt: null,
  totalVoteValueUsd: 0,
  socialLinks: [],
  cryptoWallets: [],
  waiv: {
    upvotingManaPercent: 0,
    downvotingManaPercent: 0,
    voteValueUsd: 0,
  },
  hive: {
    reputation: 25,
    upvotingManaPercent: 0,
    downvotingManaPercent: 0,
    resourceCreditsPercent: 0,
    voteValueUsd: 0,
  },
};
