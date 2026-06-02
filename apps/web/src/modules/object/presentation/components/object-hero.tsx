'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { shouldUnoptimizeRemoteImage, UserAvatar } from '@/shared/presentation';
import { shouldHideHero, useShellMode } from '@/shell-mode';

export type ObjectHeroProps = {
  title: string;
  subtitleTitle: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  tagline: string | null;
  displayWeightLabel: string | null;
  kindLabel: string;
  isEditMode: boolean;
  isFollowing: boolean;
  isBell: boolean;
  isFavorite: boolean;
  onToggleEdit: () => void;
  onFollowToggle: () => void;
  onBellToggle: () => void;
  onFavoriteToggle: () => void;
  primaryNav: ReactNode;
};

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

function IconHeartFavorite({ filled }: { filled: boolean }) {
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
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function ObjectHero({
  title,
  subtitleTitle,
  avatarUrl,
  coverImageUrl,
  tagline,
  displayWeightLabel,
  kindLabel,
  isEditMode,
  isFollowing,
  isBell,
  isFavorite,
  onToggleEdit,
  onFollowToggle,
  onBellToggle,
  onFavoriteToggle,
  primaryNav,
}: ObjectHeroProps) {
  const { t } = useI18n();
  const { resolvedMode } = useShellMode();

  if (shouldHideHero(resolvedMode)) {
    return null;
  }

  const hasCoverPhoto = Boolean(coverImageUrl?.trim());

  const titleCoverClasses =
    'text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85),0_0_12px_rgba(0,0,0,0.35)]';
  const mutedCoverClasses =
    'text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]';

  return (
    <header className="overflow-hidden rounded-card border border-border bg-bg shadow-card">
      <div className="relative overflow-hidden rounded-t-card">
        {hasCoverPhoto && coverImageUrl ? (
          <>
            <Image
              src={coverImageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized={shouldUnoptimizeRemoteImage(coverImageUrl)}
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/55"
              aria-hidden
            />
            <div className="absolute inset-0 bg-nav-bg/65" aria-hidden />
          </>
        ) : null}

        <div
          className={[
            'relative z-10 px-gutter pb-5 pt-6 sm:px-gutter-sm',
            hasCoverPhoto ? 'text-white' : 'bg-nav-bg text-nav-fg',
          ].join(' ')}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <UserAvatar
              username=""
              avatarUrl={avatarUrl}
              displayName={title}
              size={96}
              isSquare
              className="border border-white/25 bg-white/10 p-1.5 backdrop-blur-sm"
            />

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={[
                    'truncate text-section font-weight-strong font-display',
                    hasCoverPhoto ? titleCoverClasses : '',
                  ].join(' ')}
                >
                  {title}
                </h1>
                <span
                  className={[
                    'rounded-btn px-2 py-0.5 text-caption font-weight-label',
                    hasCoverPhoto
                      ? `${mutedCoverClasses} bg-white/20`
                      : 'bg-white/15 text-nav-fg',
                  ].join(' ')}
                >
                  {kindLabel}
                </span>
                {displayWeightLabel ? (
                  <span
                    className={[
                      'rounded-btn px-2 py-0.5 text-caption font-weight-label tabular-nums',
                      hasCoverPhoto
                        ? `${mutedCoverClasses} bg-white/20`
                        : 'bg-white/15 text-nav-fg',
                    ].join(' ')}
                  >
                    {displayWeightLabel}
                  </span>
                ) : null}
              </div>
              {subtitleTitle ? (
                <p
                  className={[
                    'mt-1 line-clamp-2 text-body-sm font-weight-body',
                    hasCoverPhoto ? mutedCoverClasses : 'opacity-90',
                  ].join(' ')}
                >
                  {subtitleTitle}
                </p>
              ) : null}
              {tagline ? (
                <p
                  className={[
                    'mt-2 line-clamp-2 text-body-sm',
                    hasCoverPhoto ? mutedCoverClasses : 'opacity-90',
                  ].join(' ')}
                >
                  {tagline}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              <button
                type="button"
                onClick={onFollowToggle}
                className={[
                  'group rounded-btn px-4 py-2 text-body-sm font-weight-label',
                  isFollowing
                    ? 'border border-white/50 bg-white/15 text-white hover:border-red-400/80 hover:bg-red-500/25 hover:text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]'
                    : 'bg-accent text-accent-fg hover:opacity-90',
                  !hasCoverPhoto && isFollowing
                    ? 'border-border bg-bg text-fg hover:border-red-400 hover:bg-red-500/10 hover:text-red-600'
                    : '',
                ].join(' ')}
              >
                <span className={isFollowing ? 'group-hover:hidden' : ''}>
                  {isFollowing ? t('object_detail_following') : t('object_detail_follow')}
                </span>
                {isFollowing ? (
                  <span className="hidden group-hover:inline">
                    {t('object_detail_unfollow')}
                  </span>
                ) : null}
              </button>
              {isFollowing ? (
                <button
                  type="button"
                  onClick={onBellToggle}
                  className={[
                    'rounded-btn p-2',
                    hasCoverPhoto
                      ? 'border border-white/50 bg-white/15 text-white hover:bg-white/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]'
                      : 'border border-border bg-bg text-fg hover:bg-muted',
                  ].join(' ')}
                  aria-pressed={isBell}
                  title={isBell ? t('object_detail_bell_on') : t('object_detail_bell_off')}
                  aria-label={isBell ? t('object_detail_bell_on') : t('object_detail_bell_off')}
                >
                  <IconBell filled={isBell} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onToggleEdit}
                className={[
                  'rounded-btn px-4 py-2 text-body-sm font-weight-label',
                  hasCoverPhoto
                    ? 'border border-white/50 bg-white/15 text-white hover:bg-white/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]'
                    : 'border border-white/40 bg-white/10 text-nav-fg hover:bg-white/15',
                ].join(' ')}
              >
                {isEditMode ? t('object_detail_view') : t('object_detail_edit')}
              </button>
              <button
                type="button"
                onClick={onFavoriteToggle}
                className={[
                  'rounded-btn p-2',
                  hasCoverPhoto
                    ? 'border border-white/50 bg-white/15 text-white hover:bg-white/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]'
                    : 'border border-white/40 bg-white/10 text-nav-fg hover:bg-white/15',
                ].join(' ')}
                aria-pressed={isFavorite}
                title={
                  isFavorite
                    ? t('object_detail_favorites_remove')
                    : t('object_detail_favorites_add')
                }
                aria-label={
                  isFavorite
                    ? t('object_detail_favorites_remove')
                    : t('object_detail_favorites_add')
                }
              >
                <IconHeartFavorite filled={isFavorite} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-bg px-gutter pb-3 pt-0 sm:px-gutter-sm">
        {primaryNav}
      </div>
    </header>
  );
}
