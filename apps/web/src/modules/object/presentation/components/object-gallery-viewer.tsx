'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import {
  buildOdlUpdateVoteOp,
} from '@opden-data-layer/hive-broadcast';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { ChevronLeftIcon, ChevronRightIcon } from '@/icons';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { buildGalleryItemBroadcastOp } from '@opden-data-layer/hive-broadcast';
import { broadcastOdlOpWithOverflow } from '@/modules/object-updates/application/broadcast-odl-op-with-overflow';
import { broadcastOverflowErrorMessage } from '@/modules/object-updates/application/broadcast-overflow-error-message';
import { OBJECT_UPDATES_MIN_APPROVAL_PERCENT } from '@/modules/object-updates/constants';
import { AddUpdateModal } from '@/modules/object-updates/presentation/components/add-update-modal';
import { UpdateVoteControls } from '@/modules/object-updates/presentation/components/update-vote-controls';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import { ModalShell, MODAL_Z_INDEX_GALLERY, UserAvatar } from '@/shared/presentation';

import type { GalleryApprovalStatsIndex } from '@/modules/object/domain/gallery-approval-stats';
import {
  EMPTY_GALLERY_APPROVAL_STAT,
  resolveGalleryPhotoApprovalStat,
} from '@/modules/object/domain/gallery-approval-stats';
import {
  albumContainsPhoto,
  galleryPhotoToGalleryItemValue,
  galleryPhotoToImageCidOrUrlValue,
} from '@/modules/object/domain/gallery-photo-update-value';
import { fetchGalleryApprovalStatsAction } from '@/app/(app)/object/[object-id]/gallery/gallery-approval.actions';

import type {
  ProjectedGalleryAlbumView,
} from '../../domain/object-page.types';
import { useGalleryViewerGestures } from '../hooks/use-gallery-viewer-gestures';
import { GalleryMediaItem, isGalleryVideoUrl } from './gallery-media-item';
import { GalleryRankTriggerButton } from './gallery-rank-trigger-button';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const hiveAvatarUrl = (creator: string): string =>
  `https://images.hive.blog/u/${encodeURIComponent(creator)}/avatar`;

export type ObjectGalleryViewerProps = {
  objectId: string;
  objectName: string;
  album: ProjectedGalleryAlbumView;
  /** Real gallery albums on the object (excludes virtual albums like Related). */
  allGalleryAlbums: readonly ProjectedGalleryAlbumView[];
  /** On-chain `imageGallery` names (for album ensure before `imageGalleryItem`). */
  onChainGalleryAlbumNames?: readonly string[];
  initialIndex: number;
  onClose: () => void;
  viewerUsername: string | null;
  onRequireLogin: () => void;
  supportedUpdateTypes: readonly string[];
  updateTypeCounts?: Record<string, number>;
  /** Post-derived Related album — no on-chain votes or add-to-album actions. */
  isVirtualRelatedAlbum?: boolean;
  /** Embedded page HTML images — viewer chrome only (no creator, votes, or footer). */
  isReadOnlyGallery?: boolean;
};

export function ObjectGalleryViewer({
  objectId,
  objectName,
  album,
  allGalleryAlbums,
  onChainGalleryAlbumNames = [],
  initialIndex,
  onClose,
  viewerUsername,
  onRequireLogin,
  supportedUpdateTypes,
  updateTypeCounts,
  isVirtualRelatedAlbum = false,
  isReadOnlyGallery = false,
}: ObjectGalleryViewerProps) {
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [albumDropdownOpen, setAlbumDropdownOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [approvalStats, setApprovalStats] = useState<GalleryApprovalStatsIndex>({
    byUpdateId: {},
    byUrl: {},
  });
  const [optimisticVotes, setOptimisticVotes] = useState<
    Record<string, 'for' | 'against' | null>
  >({});
  const [votePending, setVotePending] = useState(false);
  const [voteConfirming, setVoteConfirming] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [addAlbumPending, setAddAlbumPending] = useState<string | null>(null);
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [addAlbumError, setAddAlbumError] = useState<string | null>(null);
  const [optimisticAlbumAdds, setOptimisticAlbumAdds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const albumDropdownRef = useRef<HTMLDivElement>(null);

  const photos = album.items;
  const count = photos.length;
  const currentPhoto = photos[activeIndex];
  const displayName = objectName.trim() || objectId;
  const isOnChainGallery = !isVirtualRelatedAlbum && !isReadOnlyGallery;
  const canSetAvatar =
    isOnChainGallery && supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE);
  const canAddToAlbum =
    isOnChainGallery &&
    supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE_GALLERY_ITEM);
  const otherGalleryAlbums = useMemo(
    () => allGalleryAlbums.filter((entry) => entry.name !== album.name),
    [allGalleryAlbums, album.name],
  );
  const photoIsInAlbum = useCallback(
    (targetAlbum: ProjectedGalleryAlbumView): boolean => {
      if (!currentPhoto) {
        return false;
      }
      return (
        optimisticAlbumAdds.has(targetAlbum.name) ||
        albumContainsPhoto(targetAlbum, currentPhoto)
      );
    },
    [currentPhoto, optimisticAlbumAdds],
  );
  const isCurrentPhotoAvatar = currentPhoto?.isAvatar === true;
  const isCurrentPhotoVideo = currentPhoto ? isGalleryVideoUrl(currentPhoto.url) : false;
  const canSetAvatarForPhoto = canSetAvatar && !isCurrentPhotoVideo;

  const currentStat = currentPhoto
    ? resolveGalleryPhotoApprovalStat(currentPhoto, approvalStats)
    : EMPTY_GALLERY_APPROVAL_STAT;

  const votableUpdateId =
    currentPhoto?.update_id ?? currentStat.updateId ?? '';
  const effectiveVote = votableUpdateId
    ? (optimisticVotes[votableUpdateId] ?? currentStat.viewer_vote)
    : null;
  const voteDisabled = votePending || voteConfirming;
  const meetsApprovalThreshold =
    currentStat.approvePercent > OBJECT_UPDATES_MIN_APPROVAL_PERCENT;

  useEffect(() => {
    setActiveIndex(initialIndex);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVideoPlaying(false);
  }, [initialIndex, album.name]);

  useEffect(() => {
    setVideoPlaying(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeIndex, currentPhoto?.url]);

  useEffect(() => {
    setOptimisticAlbumAdds(new Set());
  }, [activeIndex, currentPhoto?.url, currentPhoto?.cid]);

  useEffect(() => {
    if (!isOnChainGallery) {
      return;
    }
    let cancelled = false;
    void fetchGalleryApprovalStatsAction(objectId).then((stats) => {
      if (!cancelled) {
        setApprovalStats(stats);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOnChainGallery, objectId]);

  useEffect(() => {
    setVoteError(null);
  }, [activeIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (avatarModalOpen) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [avatarModalOpen, onClose]);

  useEffect(() => {
    if (!albumDropdownOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (
        albumDropdownRef.current &&
        !albumDropdownRef.current.contains(event.target as Node)
      ) {
        setAlbumDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [albumDropdownOpen]);

  const goPrev = useCallback(() => {
    if (count <= 1) {
      return;
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVideoPlaying(false);
    setActiveIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count <= 1) {
      return;
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setVideoPlaying(false);
    setActiveIndex((i) => (i + 1) % count);
  }, [count]);

  const zoomIn = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const { stageRef, transformStyle, pointerHandlers } = useGalleryViewerGestures({
    zoom,
    setZoom,
    pan,
    setPan,
    onGoNext: goNext,
    onGoPrev: goPrev,
    onClose,
    zoomGesturesEnabled: !isCurrentPhotoVideo,
    canNavigate: count > 1,
  });

  const onSetAsAvatar = useCallback(() => {
    setAlbumDropdownOpen(false);
    if (!viewerUsername?.trim()) {
      onRequireLogin();
      return;
    }
    setAvatarModalOpen(true);
  }, [onRequireLogin, viewerUsername]);

  const onAddToAlbum = useCallback(
    async (targetAlbumName: string) => {
      const creator = viewerUsername?.trim();
      if (!creator) {
        onRequireLogin();
        return;
      }
      if (!canAddToAlbum || addAlbumPending || !currentPhoto) {
        return;
      }
      setAddAlbumPending(targetAlbumName);
      setAddAlbumError(null);
      try {
        const itemValue = galleryPhotoToGalleryItemValue(targetAlbumName, currentPhoto);
        const op = buildGalleryItemBroadcastOp({
          id: odlCustomJsonId,
          objectId,
          creator,
          itemValue,
          onChainGalleryAlbumNames,
        });
        const result = await broadcastOdlOpWithOverflow({
          op,
          account: creator,
          odlCustomJsonId,
          objectId,
        });
        if (!result.success) {
          setAddAlbumError(broadcastOverflowErrorMessage(result.error, t));
          setAddAlbumPending(null);
          return;
        }
        setAddAlbumPending(null);
        setOptimisticAlbumAdds((prev) => new Set([...prev, targetAlbumName]));
        setAlbumDropdownOpen(false);
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(objectId),
        );
      } catch (err) {
        setAddAlbumError(
          err instanceof Error ? err.message : t('object_edit_validation_error'),
        );
        setAddAlbumPending(null);
      }
    },
    [
      addAlbumPending,
      canAddToAlbum,
      currentPhoto,
      objectId,
      odlCustomJsonId,
      onChainGalleryAlbumNames,
      onRequireLogin,
      router,
      t,
      viewerUsername,
    ],
  );

  const onVote = useCallback(
    async (vote: 'for' | 'against') => {
      const voter = viewerUsername?.trim();
      if (!voter) {
        onRequireLogin();
        return;
      }
      if (votePending || voteConfirming) {
        return;
      }
      const updateId =
        currentPhoto?.update_id ?? currentStat.updateId;
      if (!updateId) {
        return;
      }
      const currentVote = optimisticVotes[updateId] ?? currentStat.viewer_vote;
      if (currentVote === vote) {
        return;
      }
      setVoteError(null);
      setVotePending(true);
      try {
        const op = buildOdlUpdateVoteOp({
          id: odlCustomJsonId,
          updateId,
          objectId,
          voter,
          vote,
          required_posting_auths: [voter],
        });
        const { transactionId } = await getWalletFacade().broadcast({
          operations: [op],
        });
        setOptimisticVotes((prev) => ({ ...prev, [updateId]: vote }));
        setVotePending(false);
        setVoteConfirming(true);
        void awaitTrxConfirmation(transactionId).finally(() => {
          void refreshAfterBroadcast(router, () =>
            revalidateObjectAfterBroadcast(objectId),
          ).finally(() => {
            void fetchGalleryApprovalStatsAction(objectId).then(setApprovalStats);
            setVoteConfirming(false);
          });
        });
      } catch (err) {
        setVoteError(
          err instanceof Error ? err.message : t('object_edit_validation_error'),
        );
        setVotePending(false);
      }
    },
    [
      currentPhoto?.update_id,
      currentStat.updateId,
      currentStat.viewer_vote,
      objectId,
      odlCustomJsonId,
      onRequireLogin,
      optimisticVotes,
      router,
      t,
      viewerUsername,
      voteConfirming,
      votePending,
    ],
  );

  if (!currentPhoto) {
    return null;
  }

  const galleryHeader = isReadOnlyGallery ? (
      <header className="gallery-chrome-border grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4 py-3">
        <div aria-hidden />
        <span className="gallery-chrome-text tabular-nums text-body-sm font-weight-label">
          {activeIndex + 1} / {count}
        </span>
        <div className="flex items-center justify-end gap-2">
          {!isCurrentPhotoVideo ? (
            <>
              <button
                type="button"
                className="gallery-chrome-control gallery-chrome-icon-btn gallery-chrome-icon-btn--zoom-out"
                aria-label={t('object_gallery_zoom_out')}
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
              />
              <button
                type="button"
                className="gallery-chrome-control gallery-chrome-icon-btn gallery-chrome-icon-btn--zoom-in"
                aria-label={t('object_gallery_zoom_in')}
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
              />
            </>
          ) : null}
          <button
            type="button"
            className="gallery-chrome-control gallery-chrome-icon-btn gallery-chrome-icon-btn--close"
            aria-label={t('close')}
            onClick={onClose}
          />
        </div>
      </header>
  ) : (
      <header className="gallery-chrome-border grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center justify-start gap-2">
          {currentStat.creator ? (
            <>
              <Link
                href={`/@${encodeURIComponent(currentStat.creator)}`}
                className="inline-flex shrink-0 rounded-circle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                aria-label={`View profile: ${currentStat.creator}`}
                suppressHydrationWarning
              >
                <UserAvatar
                  username={currentStat.creator}
                  avatarUrl={hiveAvatarUrl(currentStat.creator)}
                  size={32}
                  displayName={currentStat.creator}
                />
              </Link>
              <Link
                href={`/@${encodeURIComponent(currentStat.creator)}`}
                className="gallery-chrome-text truncate text-body-sm font-weight-label hover:underline focus-visible:rounded-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                suppressHydrationWarning
              >
                {currentStat.creator}
              </Link>
            </>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-4 text-body-sm">
          <span
            className="gallery-chrome-text max-w-[16rem] truncate font-weight-label"
            title={displayName}
          >
            <span className="gallery-chrome-text-muted">{t('object_gallery_viewer_related_object')}</span>{' '}
            {displayName}
          </span>
          <div ref={albumDropdownRef} className="relative">
            {isVirtualRelatedAlbum ? (
              <span className="gallery-chrome-text text-body-sm">
                <span className="gallery-chrome-text-muted">{t('album')}:</span> {album.name}
              </span>
            ) : (
              <>
            <button
              type="button"
              className="gallery-chrome-control inline-flex items-center gap-1 px-2 py-1"
              aria-expanded={albumDropdownOpen}
              aria-haspopup="listbox"
              onClick={() => setAlbumDropdownOpen((open) => !open)}
            >
              <span className="gallery-chrome-text-muted">{t('album')}:</span>
              <span>{album.name}</span>
              <span aria-hidden className="text-caption">
                {albumDropdownOpen ? '▴' : '▾'}
              </span>
            </button>
            {albumDropdownOpen ? (
              <div
                className="absolute left-0 top-full z-10 mt-1 min-w-[12rem] overflow-hidden rounded-btn border border-border bg-surface shadow-card-float"
                role="listbox"
                aria-label={t('album')}
              >
                <div className="border-b border-border px-3 py-2 text-body-sm font-weight-label text-fg">
                  {t('album')}
                </div>
                <label className="flex cursor-default items-center gap-2 px-3 py-2 text-body-sm text-fg opacity-70">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    readOnly
                    className="size-4 shrink-0 accent-accent"
                    aria-label={album.name}
                  />
                  <span>{album.name}</span>
                </label>
                {otherGalleryAlbums.map((targetAlbum) => {
                  const alreadyInAlbum = photoIsInAlbum(targetAlbum);
                  if (alreadyInAlbum) {
                    return (
                      <label
                        key={targetAlbum.name}
                        className="flex cursor-default items-center gap-2 px-3 py-2 text-body-sm text-fg opacity-70"
                      >
                        <input
                          type="checkbox"
                          checked
                          disabled
                          readOnly
                          className="size-4 shrink-0 accent-accent"
                          aria-label={targetAlbum.name}
                        />
                        <span className="min-w-0 flex-1 truncate">{targetAlbum.name}</span>
                      </label>
                    );
                  }
                  return (
                    <button
                      key={targetAlbum.name}
                      type="button"
                      role="option"
                      disabled={!canAddToAlbum || addAlbumPending !== null}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-fg hover:bg-ghost-surface disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void onAddToAlbum(targetAlbum.name)}
                    >
                      <span
                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-[2px] border border-border"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{targetAlbum.name}</span>
                      {addAlbumPending === targetAlbum.name ? (
                        <span className="text-caption" aria-hidden>
                          …
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {canSetAvatarForPhoto ? (
                  <>
                    <div className="border-t border-border" role="separator" />
                    {isCurrentPhotoAvatar ? (
                      <label className="flex cursor-default items-center gap-2 px-3 py-2 text-body-sm text-fg opacity-70">
                        <input
                          type="checkbox"
                          checked
                          disabled
                          readOnly
                          className="size-4 shrink-0 accent-accent"
                          aria-label={t('object_gallery_set_as_avatar')}
                        />
                        <span>{t('object_gallery_set_as_avatar')}</span>
                      </label>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-fg hover:bg-ghost-surface"
                        onClick={onSetAsAvatar}
                      >
                        <span
                          className="inline-flex size-4 shrink-0 items-center justify-center rounded-[2px] border border-border"
                          aria-hidden
                        />
                        <span>{t('object_gallery_set_as_avatar')}</span>
                      </button>
                    )}
                  </>
                ) : null}
                {addAlbumError ? (
                  <p className="border-t border-border px-3 py-2 text-caption text-error" role="alert">
                    {addAlbumError}
                  </p>
                ) : null}
              </div>
            ) : null}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {!isCurrentPhotoVideo ? (
            <>
              <button
                type="button"
                className="gallery-chrome-control gallery-chrome-icon-btn gallery-chrome-icon-btn--zoom-out"
                aria-label={t('object_gallery_zoom_out')}
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
              />
              <button
                type="button"
                className="gallery-chrome-control gallery-chrome-icon-btn gallery-chrome-icon-btn--zoom-in"
                aria-label={t('object_gallery_zoom_in')}
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
              />
            </>
          ) : null}
          <button
            type="button"
            className="gallery-chrome-control gallery-chrome-icon-btn gallery-chrome-icon-btn--close"
            aria-label={t('close')}
            onClick={onClose}
          />
        </div>
      </header>
  );

  const galleryMain = (
      <div className="relative flex min-h-0 flex-1 px-2">
        {count > 1 ? (
          <button
            type="button"
            className="gallery-nav-arrow absolute left-4 z-10 hidden shrink-0 items-center justify-center p-2 md:left-6 md:inline-flex"
            aria-label={t('object_detail_gallery_prev')}
            onClick={goPrev}
          >
            <ChevronLeftIcon size={30} strokeWidth={1.5} />
          </button>
        ) : null}
        <div
          ref={stageRef}
          className="relative min-h-0 min-w-0 flex-1 touch-none select-none overflow-hidden"
          {...pointerHandlers}
        >
          <div
            className="relative size-full"
            style={isCurrentPhotoVideo ? undefined : transformStyle}
          >
            <GalleryMediaItem
              src={currentPhoto.url}
              sizes="100vw"
              priority
              variant="viewer"
              imageClassName="object-contain"
              playing={videoPlaying}
              onPlayingChange={setVideoPlaying}
            />
          </div>
        </div>
        {count > 1 ? (
          <button
            type="button"
            className="gallery-nav-arrow absolute right-4 z-10 hidden shrink-0 items-center justify-center p-2 md:right-6 md:inline-flex"
            aria-label={t('object_detail_gallery_next')}
            onClick={goNext}
          >
            <ChevronRightIcon size={30} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
  );

  const galleryFooter = isReadOnlyGallery
    ? null
    : isVirtualRelatedAlbum ? (
      <footer className="gallery-chrome-footer flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
        {currentPhoto?.postAuthor ? (
          <Link
            href={`/@${encodeURIComponent(currentPhoto.postAuthor)}`}
            className="gallery-chrome-text text-body-sm font-weight-label hover:underline"
            suppressHydrationWarning
          >
            @{currentPhoto.postAuthor}
          </Link>
        ) : (
          <span className="gallery-chrome-text-muted text-body-sm">{t('related')}</span>
        )}
      </footer>
  ) : (
      <footer className="gallery-chrome-footer flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <UpdateVoteControls
            objectId={objectId}
            updateId={votableUpdateId}
            approvePercent={currentStat.approvePercent}
            decisivePrivilegedVote={currentStat.decisive_privileged_vote ?? null}
            forCount={currentStat.forCount}
            againstCount={currentStat.againstCount}
            forPreviewVoters={currentStat.forPreviewVoters ?? []}
            againstPreviewVoters={currentStat.againstPreviewVoters ?? []}
            optimisticVote={effectiveVote}
            voteDisabled={voteDisabled || !votableUpdateId}
            onVote={(vote) => void onVote(vote)}
            variant="gallery"
            layoutClassName="flex flex-wrap gap-3"
          />
          {currentPhoto?.update_id && !isCurrentPhotoAvatar ? (
            <GalleryRankTriggerButton
              variant="gallery"
              updateId={currentPhoto.update_id}
              objectId={objectId}
              rankScore={currentPhoto.rankScore}
              viewerRank={currentPhoto.viewerRank ?? null}
              viewerUsername={viewerUsername}
              onRequireLogin={onRequireLogin}
              imagePreviewUrl={currentPhoto.url}
              onOpenChange={setRankModalOpen}
            />
          ) : null}
        </div>
        <span>
          {t('object_updates_approval')}{' '}
          <span
            className={`font-weight-label ${
              meetsApprovalThreshold
                ? 'gallery-approval-percent--approved'
                : 'gallery-approval-percent--rejected'
            }`}
          >
            {currentStat.approvePercent.toFixed(2)}%
          </span>
        </span>
        {voteError ? (
          <p className="gallery-vote-error w-full text-caption" role="alert">
            {voteError}
          </p>
        ) : null}
      </footer>
  );

  return (
    <>
      <ModalShell
        open
        onClose={onClose}
        variant="fullscreen"
        zIndex={MODAL_Z_INDEX_GALLERY}
        closeOnEscape={!rankModalOpen}
        ariaLabel={t('gallery')}
        scrimClassName="bg-transparent"
        panelClassName="gallery-scrim text-fg"
        scrollBody={false}
        header={galleryHeader}
        footer={galleryFooter}
      >
        {galleryMain}
      </ModalShell>
      {canSetAvatar && viewerUsername ? (
        <AddUpdateModal
          mode="generic"
          open={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          objectId={objectId}
          viewerUsername={viewerUsername}
          updateType={UPDATE_TYPES.IMAGE}
          initialValue={galleryPhotoToImageCidOrUrlValue(currentPhoto)}
          updateTypeCounts={updateTypeCounts}
        />
      ) : null}
    </>
  );
}
