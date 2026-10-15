'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { BellIcon, HeartIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { AddUpdateModal } from '@/modules/object-updates/presentation/components/add-update-modal';
import { ObjectThumbnail, OptimisticNavLink } from '@/shared/presentation';
import { ShellFullBleedBand, ShellInset } from '@/shared/presentation/layout';
import { HIDDEN_ON_DESKTOP_CLASS, shouldHideHeroOnDesktop, useShellMode } from '@/shell-mode';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import { resolveGalleryPhotoIndexByUrl } from '../../domain/resolve-gallery-photos-album';
import { ObjectHeroCoverImage } from './object-hero-cover-image';

export type ObjectHeroEditContext = {
  objectId: string;
  viewerUsername: string;
  supportedUpdateTypes: readonly string[];
};

export type ObjectHeroProps = {
  title: string;
  subtitleTitle: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  tagline: string | null;
  displayWeightLabel: string | null;
  kindLabel: string;
  /** Translated lifecycle status badge when not `active`. */
  statusBadgeLabel: string | null;
  /** When set, hero status label links to status updates feed. */
  statusUpdatesHref?: string | null;
  isEditMode: boolean;
  isFollowing: boolean;
  isBell: boolean;
  isFavorite: boolean;
  onToggleEdit: () => void;
  onFollowToggle: () => void;
  onBellToggle: () => void;
  onFavoriteToggle: () => void;
  primaryNav: ReactNode;
  editContext?: ObjectHeroEditContext;
  galleryPhotosAlbum?: ProjectedGalleryAlbumView | null;
  onOpenGalleryPhoto?: (album: ProjectedGalleryAlbumView, photoIndex: number) => void;
};

type HeroModalTarget = 'avatar-background' | 'name' | 'title';

const TITLE_CLASS =
  'break-words text-display leading-compressed tracking-display font-weight-strong font-display';

const ICON_BTN_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center sm:size-10';

type ObjectHeroActionBarProps = {
  hasCoverPhoto: boolean;
  canEditBackground: boolean;
  isFollowing: boolean;
  isBell: boolean;
  isEditMode: boolean;
  isFavorite: boolean;
  onEditBackground: () => void;
  onFollowToggle: () => void;
  onBellToggle: () => void;
  onToggleEdit: () => void;
  onFavoriteToggle: () => void;
};

function ObjectHeroActionBar({
  hasCoverPhoto,
  canEditBackground,
  isFollowing,
  isBell,
  isEditMode,
  isFavorite,
  onEditBackground,
  onFollowToggle,
  onBellToggle,
  onToggleEdit,
  onFavoriteToggle,
}: ObjectHeroActionBarProps) {
  const { t } = useI18n();

  const ghostBtnClass = hasCoverPhoto
    ? 'hero-on-photo-btn'
    : 'border border-ghost-border bg-ghost-surface text-nav-fg hover:border-accent hover:text-accent';

  const pillBtnClass = `rounded-pill px-3 py-1.5 text-body-sm font-weight-label sm:px-4 sm:py-2`;

  const iconBtnClass = [
    ICON_BTN_CLASS,
    'rounded-circle',
    hasCoverPhoto ? 'hero-on-photo-btn' : ghostBtnClass,
  ].join(' ');

  return (
    <div className="flex min-w-0 flex-col items-end gap-2 self-start sm:self-end sm:pb-1">
      {canEditBackground ? (
        <button
          type="button"
          onClick={onEditBackground}
          className={[
            'flex items-center gap-1 rounded-pill px-3 py-1.5 text-caption font-weight-label transition-colors',
            hasCoverPhoto
              ? 'border border-white/30 bg-black/30 text-white/90 backdrop-blur-sm hover:border-white/60 hover:bg-black/50 hover:text-white'
              : 'border border-ghost-border bg-ghost-surface text-nav-fg hover:border-accent hover:text-accent',
          ].join(' ')}
          aria-label={t('object_detail_edit_background')}
        >
          <span className="text-base leading-none">+</span>
          {t('object_detail_edit_background')}
        </button>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onFollowToggle}
          className={[
            'group',
            pillBtnClass,
            isFollowing
              ? hasCoverPhoto
                ? 'hero-on-photo-btn hero-on-photo-btn-destructive rounded-pill'
                : 'hero-follow-active rounded-pill'
              : 'rounded-pill bg-accent text-accent-fg hover:opacity-90',
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
            className={iconBtnClass}
            aria-pressed={isBell}
            title={isBell ? t('object_detail_bell_on') : t('object_detail_bell_off')}
            aria-label={isBell ? t('object_detail_bell_on') : t('object_detail_bell_off')}
          >
            <BellIcon
              size={22}
              className={isBell ? 'text-accent fill-current' : 'text-current'}
            />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleEdit}
          className={[pillBtnClass, 'rounded-pill', hasCoverPhoto ? 'hero-on-photo-btn' : ghostBtnClass].join(
            ' ',
          )}
        >
          {isEditMode ? t('object_detail_view') : t('object_detail_edit')}
        </button>
        <button
          type="button"
          onClick={onFavoriteToggle}
          className={iconBtnClass}
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
          <HeartIcon
            size={22}
            className={isFavorite ? 'text-accent fill-current' : 'text-current'}
          />
        </button>
      </div>
    </div>
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
  statusBadgeLabel,
  statusUpdatesHref = null,
  isEditMode,
  isFollowing,
  isBell,
  isFavorite,
  onToggleEdit,
  onFollowToggle,
  onBellToggle,
  onFavoriteToggle,
  primaryNav,
  editContext,
  galleryPhotosAlbum = null,
  onOpenGalleryPhoto,
}: ObjectHeroProps) {
  const { t } = useI18n();
  const { resolvedMode } = useShellMode();
  const [modalTarget, setModalTarget] = useState<HeroModalTarget | null>(null);

  const hiddenOnDesktop = shouldHideHeroOnDesktop(resolvedMode);
  const hasCoverPhoto = Boolean(coverImageUrl?.trim());

  const canEditAvatar =
    isEditMode && editContext?.supportedUpdateTypes.includes('image');
  const canEditBackground =
    isEditMode && editContext?.supportedUpdateTypes.includes('imageBackground');
  const canEditName =
    isEditMode && editContext?.supportedUpdateTypes.includes('name');
  const canEditTitle =
    isEditMode && editContext?.supportedUpdateTypes.includes('title');
  const canOpenAvatarGallery =
    !(canEditAvatar || canEditBackground) &&
    Boolean(avatarUrl?.trim()) &&
    Boolean(galleryPhotosAlbum?.items.length) &&
    Boolean(onOpenGalleryPhoto);

  function openAvatarGallery(): void {
    if (!avatarUrl || !galleryPhotosAlbum || !onOpenGalleryPhoto) {
      return;
    }
    const byUrl = resolveGalleryPhotoIndexByUrl(galleryPhotosAlbum, avatarUrl);
    const byAvatar = galleryPhotosAlbum.items.findIndex((photo) => photo.isAvatar);
    const index = byUrl >= 0 ? byUrl : byAvatar >= 0 ? byAvatar : 0;
    onOpenGalleryPhoto(galleryPhotosAlbum, index);
  }

  function modalCandidates(target: HeroModalTarget): string[] {
    if (target === 'avatar-background') {
      return ['image', 'imageBackground'].filter((type) =>
        editContext?.supportedUpdateTypes.includes(type),
      );
    }
    if (target === 'name') return ['name'];
    if (target === 'title') return ['title'];
    return [];
  }

  const avatarThumbnail = (
    <ObjectThumbnail
      src={avatarUrl}
      alt={title}
      size={96}
      avatarSize="large"
      priority
      className={[
        'rounded-card bg-surface-alt object-cover shadow-card',
        hasCoverPhoto ? 'hero-on-photo-avatar' : '',
        canOpenAvatarGallery ? 'pointer-events-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );

  return (
    <header className={hiddenOnDesktop ? HIDDEN_ON_DESKTOP_CLASS : undefined}>
      <ShellFullBleedBand className="relative overflow-hidden">
        {hasCoverPhoto && coverImageUrl ? (
          <ObjectHeroCoverImage
            coverImageUrl={coverImageUrl}
            priority={!hiddenOnDesktop}
          />
        ) : (
          <div className="absolute inset-0 bg-nav-bg" aria-hidden />
        )}

        <ShellInset
          className={[
            'relative z-10 pb-5 pt-6',
            hasCoverPhoto ? 'gallery-chrome-text' : 'text-nav-fg',
          ].join(' ')}
        >
          <div
            className={[
              'grid gap-x-3 gap-y-3',
              'grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto]',
              'sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-[auto] sm:items-end sm:gap-x-4 sm:gap-y-0',
            ].join(' ')}
          >
            <div className="relative shrink-0 self-start sm:col-start-1 sm:row-start-1 sm:self-end">
              {canOpenAvatarGallery ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-card"
                  aria-label={t('gallery')}
                  onClick={openAvatarGallery}
                >
                  {avatarThumbnail}
                </button>
              ) : (
                avatarThumbnail
              )}
              {(canEditAvatar || canEditBackground) ? (
                <button
                  type="button"
                  onClick={() => setModalTarget('avatar-background')}
                  className="absolute inset-0 flex items-center justify-center rounded-card bg-black/30 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                  aria-label={t('object_detail_edit_avatar_background')}
                >
                  <span className="text-2xl font-light text-white/90">+</span>
                </button>
              ) : null}
            </div>

            <div className="col-span-2 min-w-0 pb-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
              {canEditName ? (
                <button
                  type="button"
                  onClick={() => setModalTarget('name')}
                  className={[
                    'group/name relative -mx-1 -my-0.5 block w-full rounded-md px-1 py-0.5 text-left transition-colors',
                    hasCoverPhoto ? 'hover:bg-white/10' : 'hover:bg-black/5',
                  ].join(' ')}
                  aria-label={t('object_detail_edit_name')}
                >
                  <h1
                    className={[TITLE_CLASS, hasCoverPhoto ? 'hero-on-photo-title' : ''].join(' ')}
                  >
                    {title}
                  </h1>
                  <span
                    className={[
                      'absolute right-1.5 top-1/2 -translate-y-1/2 text-xl font-light opacity-0 transition-opacity group-hover/name:opacity-100',
                      hasCoverPhoto ? 'text-white/80' : 'text-accent',
                    ].join(' ')}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
              ) : (
                <h1
                  className={[TITLE_CLASS, hasCoverPhoto ? 'hero-on-photo-title' : ''].join(' ')}
                >
                  {title}
                </h1>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    'inline-flex items-center rounded-pill px-2 py-0.5 text-caption font-weight-label leading-none',
                    hasCoverPhoto
                      ? 'hero-on-photo-chip'
                      : 'bg-ghost-surface text-nav-fg',
                  ].join(' ')}
                >
                  {kindLabel}
                </span>
                {statusBadgeLabel ? (
                  statusUpdatesHref ? (
                    <OptimisticNavLink
                      href={statusUpdatesHref}
                      method="replace"
                      className={[
                        'inline-flex items-center text-caption font-weight-strong leading-none',
                        hasCoverPhoto ? 'hero-on-photo-muted hover:underline' : 'text-fg hover:underline',
                      ].join(' ')}
                    >
                      {statusBadgeLabel}
                    </OptimisticNavLink>
                  ) : (
                    <span
                      className={[
                        'inline-flex items-center text-caption font-weight-strong leading-none',
                        hasCoverPhoto ? 'hero-on-photo-muted' : 'text-fg',
                      ].join(' ')}
                    >
                      {statusBadgeLabel}
                    </span>
                  )
                ) : null}
                {displayWeightLabel ? (
                  <span
                    className={[
                      'inline-flex items-center rounded-pill px-2 py-0.5 text-caption font-weight-label tabular-nums leading-none',
                      hasCoverPhoto
                        ? 'hero-on-photo-chip'
                        : 'bg-ghost-surface text-nav-fg',
                    ].join(' ')}
                  >
                    {displayWeightLabel}
                  </span>
                ) : null}
              </div>
              {subtitleTitle != null || canEditTitle ? (
                canEditTitle ? (
                  <button
                    type="button"
                    onClick={() => setModalTarget('title')}
                    className={[
                      'group/title relative -mx-1 mt-1 block w-full rounded-md px-1 py-0.5 text-left transition-colors',
                      hasCoverPhoto ? 'hover:bg-white/10' : 'hover:bg-black/5',
                    ].join(' ')}
                    aria-label={t('object_detail_edit_title')}
                  >
                    {subtitleTitle ? (
                      <p
                        className={[
                          'line-clamp-2 text-body-sm font-weight-body',
                          hasCoverPhoto ? 'hero-on-photo-muted' : 'opacity-90',
                        ].join(' ')}
                      >
                        {subtitleTitle}
                      </p>
                    ) : (
                      <span
                        className={[
                          'text-body-sm',
                          hasCoverPhoto ? 'text-white/40' : 'text-muted/50',
                        ].join(' ')}
                      >
                        {t('object_detail_add_title_placeholder')}
                      </span>
                    )}
                    <span
                      className={[
                        'absolute right-1.5 top-1/2 -translate-y-1/2 text-xl font-light opacity-0 transition-opacity group-hover/title:opacity-100',
                        hasCoverPhoto ? 'text-white/80' : 'text-accent',
                      ].join(' ')}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                ) : subtitleTitle ? (
                  <p
                    className={[
                      'mt-1 line-clamp-2 text-body-sm font-weight-body',
                      hasCoverPhoto ? 'hero-on-photo-muted' : 'opacity-90',
                    ].join(' ')}
                  >
                    {subtitleTitle}
                  </p>
                ) : null
              ) : null}
            </div>

            <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3 sm:row-start-1">
              <ObjectHeroActionBar
                hasCoverPhoto={hasCoverPhoto}
                canEditBackground={Boolean(canEditBackground)}
                isFollowing={isFollowing}
                isBell={isBell}
                isEditMode={isEditMode}
                isFavorite={isFavorite}
                onEditBackground={() => setModalTarget('avatar-background')}
                onFollowToggle={onFollowToggle}
                onBellToggle={onBellToggle}
                onToggleEdit={onToggleEdit}
                onFavoriteToggle={onFavoriteToggle}
              />
            </div>
          </div>
        </ShellInset>
      </ShellFullBleedBand>

      <ShellFullBleedBand className="border-t border-border bg-bg shadow-card">
        <ShellInset className="pb-3 pt-0">
          <div
            className={[
              'shell-profile-grid shell-object-page-grid grid grid-cols-1 gap-card-padding',
              'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
            ].join(' ')}
          >
            <div className="min-w-0 lg:col-span-3">{primaryNav}</div>
          </div>
        </ShellInset>
      </ShellFullBleedBand>

      {editContext && modalTarget ? (
        <AddUpdateModal
          open
          mode="leftRail"
          onClose={() => setModalTarget(null)}
          objectId={editContext.objectId}
          viewerUsername={editContext.viewerUsername}
          candidateUpdateTypes={modalCandidates(modalTarget)}
        />
      ) : null}
    </header>
  );
}
