'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AddUpdateModal } from '@/modules/object-updates/presentation/components/add-update-modal';
import { useLockBodyScroll } from '@/shared/presentation';

import type { GalleryApprovalStatsIndex } from '@/modules/object/domain/gallery-approval-stats';
import { resolveGalleryPhotoApprovalStat } from '@/modules/object/domain/gallery-approval-stats';
import { fetchGalleryApprovalStatsAction } from '@/app/(app)/object/[object-id]/gallery/gallery-approval.actions';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import { GalleryImage } from './gallery-image';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export type ObjectGalleryViewerProps = {
  objectId: string;
  objectName: string;
  album: ProjectedGalleryAlbumView;
  initialIndex: number;
  onClose: () => void;
  viewerUsername: string | null;
  onRequireLogin: () => void;
  supportedUpdateTypes: readonly string[];
  updateTypeCounts?: Record<string, number>;
};

export function ObjectGalleryViewer({
  objectId,
  objectName,
  album,
  initialIndex,
  onClose,
  viewerUsername,
  onRequireLogin,
  supportedUpdateTypes,
  updateTypeCounts,
}: ObjectGalleryViewerProps) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [albumDropdownOpen, setAlbumDropdownOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [approvalStats, setApprovalStats] = useState<GalleryApprovalStatsIndex>({
    byUpdateId: {},
    byUrl: {},
  });
  const albumDropdownRef = useRef<HTMLDivElement>(null);

  const photos = album.items;
  const count = photos.length;
  const currentPhoto = photos[activeIndex];
  const displayName = objectName.trim() || objectId;
  const canSetAvatar = supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE);

  useLockBodyScroll(true);

  useEffect(() => {
    setActiveIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, album.name]);

  useEffect(() => {
    let cancelled = false;
    void fetchGalleryApprovalStatsAction(objectId).then((stats) => {
      if (!cancelled) {
        setApprovalStats(stats);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [objectId]);

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
    setActiveIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count <= 1) {
      return;
    }
    setZoom(1);
    setActiveIndex((i) => (i + 1) % count);
  }, [count]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const onSetAsAvatar = useCallback(() => {
    setAlbumDropdownOpen(false);
    if (!viewerUsername?.trim()) {
      onRequireLogin();
      return;
    }
    setAvatarModalOpen(true);
  }, [onRequireLogin, viewerUsername]);

  if (!currentPhoto) {
    return null;
  }

  const currentStat = resolveGalleryPhotoApprovalStat(currentPhoto, approvalStats);

  const overlay = (
    <div
      className="fixed inset-0 z-[150] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-black/90 text-fg"
      role="dialog"
      aria-modal="true"
      aria-label={t('gallery')}
    >
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 px-4 py-3">
        <div aria-hidden />
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-4 text-body-sm">
          <span className="truncate font-weight-label text-white">
            <span className="text-white/70">{t('object_gallery_viewer_related_object')}</span>{' '}
            {displayName}
          </span>
          <div ref={albumDropdownRef} className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-btn border border-white/20 px-2 py-1 text-white hover:bg-white/10"
              aria-expanded={albumDropdownOpen}
              onClick={() => setAlbumDropdownOpen((open) => !open)}
            >
              <span className="text-white/70">{t('album')}:</span>
              <span>{album.name}</span>
              <span aria-hidden className="text-caption">
                {albumDropdownOpen ? '▴' : '▾'}
              </span>
            </button>
            {albumDropdownOpen ? (
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[12rem] overflow-hidden rounded-btn border border-border bg-surface shadow-card-float">
                <div className="border-b border-border px-3 py-2 text-body-sm text-fg">
                  {album.name}
                </div>
                {canSetAvatar ? (
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-body-sm text-fg hover:bg-ghost-surface"
                    onClick={onSetAsAvatar}
                  >
                    {t('object_gallery_set_as_avatar')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-btn border border-white/20 text-white hover:bg-white/10"
            aria-label={t('object_gallery_zoom_out')}
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
          >
            −
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-btn border border-white/20 text-white hover:bg-white/10"
            aria-label={t('object_gallery_zoom_in')}
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
          >
            +
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-btn border border-white/20 text-body-lg text-white hover:bg-white/10"
            aria-label={t('close')}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-4">
        {count > 1 ? (
          <button
            type="button"
            className="absolute left-2 z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-btn border border-white/20 text-display text-white hover:bg-white/10 md:left-4"
            aria-label={t('object_detail_gallery_prev')}
            onClick={goPrev}
          >
            ‹
          </button>
        ) : null}
        <div className="relative h-full w-full max-w-5xl overflow-hidden">
          <div
            className="relative mx-auto h-full w-full max-h-[calc(100vh-8rem)]"
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.15s ease',
            }}
          >
            <GalleryImage
              src={currentPhoto.url}
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          </div>
        </div>
        {count > 1 ? (
          <button
            type="button"
            className="absolute right-2 z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-btn border border-white/20 text-display text-white hover:bg-white/10 md:right-4"
            aria-label={t('object_detail_gallery_next')}
            onClick={goNext}
          >
            ›
          </button>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-body-sm text-white/90">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {t('object_updates_approve')} {currentStat.forCount}
          </span>
          <span className="text-white/40">|</span>
          <span>
            {t('object_updates_reject')} {currentStat.againstCount}
          </span>
        </div>
        <span>
          {t('object_updates_approval')}{' '}
          <span className="font-weight-label text-accent">
            {currentStat.approvePercent.toFixed(2)}%
          </span>
        </span>
      </footer>

      {canSetAvatar && viewerUsername ? (
        <AddUpdateModal
          mode="generic"
          open={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          objectId={objectId}
          viewerUsername={viewerUsername}
          updateType={UPDATE_TYPES.IMAGE}
          initialValue={{ url: currentPhoto.url }}
          updateTypeCounts={updateTypeCounts}
        />
      ) : null}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(overlay, document.body);
}
