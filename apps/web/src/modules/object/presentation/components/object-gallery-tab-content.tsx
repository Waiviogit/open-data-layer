'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import {
  RELATED_ALBUM_NAME,
  isObjectTypeEligibleForRelatedAlbum,
} from '@opden-data-layer/core/post-related-images';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AddUpdateModal } from '@/modules/object-updates/presentation/components/add-update-modal';
import {
  galleryAlbumPickerNames,
  initialGalleryItemFormValue,
} from '@/modules/object-updates/application/gallery-form-value';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import type { RelatedAlbumPreviewView } from '../../domain/related-album.types';
import { fetchObjectRelatedAlbumPreviewAction } from '../../infrastructure/object-related-album.actions';
import { GalleryAlbumCardSkeleton } from './gallery-skeletons';
import { GalleryMediaItem, isGalleryVideoUrl } from './gallery-media-item';

export type ObjectGalleryTabContentProps = {
  objectId: string;
  objectName: string;
  galleryAlbums: ProjectedGalleryAlbumView[];
  onChainGalleryAlbumNames?: readonly string[];
  activeAlbumName: string | null;
  viewerUsername: string | null;
  onRequireLogin: () => void;
  supportedUpdateTypes: readonly string[];
  updateTypeCounts?: Record<string, number>;
  onOpenAlbum: (albumName: string) => void;
  onBackToAlbums: () => void;
  /** Opens full-screen viewer on the object page layer (outside scrollable gallery grid). */
  onOpenPhoto?: (album: ProjectedGalleryAlbumView, photoIndex: number) => void;
  objectTypeKey?: string;
  relatedAlbumPreview?: RelatedAlbumPreviewView | null;
};

function albumCoverUrl(album: ProjectedGalleryAlbumView): string | null {
  return album.items[0]?.url ?? null;
}

export function ObjectGalleryTabContent({
  objectId,
  objectName,
  galleryAlbums,
  onChainGalleryAlbumNames = [],
  activeAlbumName,
  viewerUsername,
  onRequireLogin,
  supportedUpdateTypes,
  updateTypeCounts,
  onOpenAlbum,
  onBackToAlbums,
  onOpenPhoto,
  objectTypeKey = '',
  relatedAlbumPreview = null,
}: ObjectGalleryTabContentProps) {
  const { t } = useI18n();
  const [addAlbumOpen, setAddAlbumOpen] = useState(false);
  const [addImageOpen, setAddImageOpen] = useState(false);

  const canAddAlbum = supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE_GALLERY);
  const canAddImage = supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE_GALLERY_ITEM);
  const albumPickerNames = useMemo(
    () => galleryAlbumPickerNames(onChainGalleryAlbumNames),
    [onChainGalleryAlbumNames],
  );
  const addImageInitialValue = useMemo(
    () => initialGalleryItemFormValue(activeAlbumName ?? undefined),
    [activeAlbumName],
  );
  const relatedAlbumEligible = isObjectTypeEligibleForRelatedAlbum(objectTypeKey);
  const [resolvedRelatedPreview, setResolvedRelatedPreview] =
    useState<RelatedAlbumPreviewView | null>(relatedAlbumPreview);
  const [relatedPreviewLoading, setRelatedPreviewLoading] = useState(
    relatedAlbumEligible && relatedAlbumPreview == null,
  );
  const [relatedPreviewError, setRelatedPreviewError] = useState(false);

  const applyPreviewResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchObjectRelatedAlbumPreviewAction>>) => {
      if (result.status === 'error') {
        setRelatedPreviewError(true);
        setResolvedRelatedPreview(null);
        return;
      }
      setRelatedPreviewError(false);
      setResolvedRelatedPreview(result.data);
    },
    [],
  );

  const retryRelatedPreview = useCallback(() => {
    setRelatedPreviewLoading(true);
    setRelatedPreviewError(false);
    void fetchObjectRelatedAlbumPreviewAction(objectId).then((result) => {
      applyPreviewResult(result);
      setRelatedPreviewLoading(false);
    });
  }, [applyPreviewResult, objectId]);

  useEffect(() => {
    setResolvedRelatedPreview(relatedAlbumPreview);
  }, [relatedAlbumPreview]);

  useEffect(() => {
    if (!relatedAlbumEligible) {
      setRelatedPreviewLoading(false);
      setRelatedPreviewError(false);
      return;
    }
    if (relatedAlbumPreview != null) {
      setRelatedPreviewLoading(false);
      setRelatedPreviewError(false);
      return;
    }

    let cancelled = false;
    setRelatedPreviewLoading(true);
    setRelatedPreviewError(false);
    void fetchObjectRelatedAlbumPreviewAction(objectId).then((result) => {
      if (cancelled) {
        return;
      }
      applyPreviewResult(result);
      setRelatedPreviewLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [applyPreviewResult, objectId, relatedAlbumEligible, relatedAlbumPreview]);

  const showRelatedAlbum =
    relatedAlbumEligible && (resolvedRelatedPreview?.count ?? 0) > 0;
  const relatedCoverUrl = resolvedRelatedPreview?.items[0]?.url ?? null;

  const requireLoginOr = (action: () => void) => {
    if (!viewerUsername?.trim()) {
      onRequireLogin();
      return;
    }
    action();
  };

  if (activeAlbumName) {
    const album = galleryAlbums.find((entry) => entry.name === activeAlbumName);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="text-body-sm font-weight-label text-accent hover:underline"
            onClick={onBackToAlbums}
          >
            {t('back_to_albums')}
          </button>
          {canAddImage ? (
            <button
              type="button"
              className="rounded-btn border border-border bg-bg px-3 py-1.5 text-body-sm font-weight-label text-fg hover:bg-surface"
              onClick={() => requireLoginOr(() => setAddImageOpen(true))}
            >
              {t('add_new_image')}
            </button>
          ) : null}
        </div>

        {!album ? (
          <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
            <p className="text-fg">{t('gallery_list_empty')}</p>
            <button
              type="button"
              className="mt-3 text-body-sm font-weight-label text-accent hover:underline"
              onClick={onBackToAlbums}
            >
              {t('back_to_albums')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-section font-display text-heading">{album.name}</h2>
            {album.items.length === 0 ? (
              <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
                <p>{t('gallery_list_empty')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {album.items.map((photo, index) => (
                  <button
                    key={`${photo.url}-${index}`}
                    type="button"
                    className="relative aspect-square overflow-hidden rounded-btn border border-border bg-surface/60 hover:border-accent/40"
                    aria-label={
                      isGalleryVideoUrl(photo.url) ? t('play_video') : undefined
                    }
                    onClick={() => onOpenPhoto?.(album, index)}
                  >
                    <GalleryMediaItem
                      src={photo.url}
                      sizes="(max-width: 768px) 50vw, 320px"
                      previewOnly
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {canAddImage && viewerUsername ? (
          <AddUpdateModal
            mode="generic"
            open={addImageOpen}
            onClose={() => setAddImageOpen(false)}
            objectId={objectId}
            viewerUsername={viewerUsername}
            updateType={UPDATE_TYPES.IMAGE_GALLERY_ITEM}
            initialValue={addImageInitialValue}
            galleryAlbumNames={albumPickerNames}
            onChainGalleryAlbumNames={onChainGalleryAlbumNames}
            lockGalleryAlbum={Boolean(activeAlbumName)}
            updateTypeCounts={updateTypeCounts}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canAddAlbum ? (
          <button
            type="button"
            className="rounded-btn border border-border bg-bg px-3 py-1.5 text-body-sm font-weight-label text-fg hover:bg-surface"
            onClick={() => requireLoginOr(() => setAddAlbumOpen(true))}
          >
            {t('add_new_album')}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {galleryAlbums.map((album) => {
          const cover = albumCoverUrl(album);
          return (
            <button
              key={album.name}
              type="button"
              className="group flex flex-col overflow-hidden rounded-btn border border-border bg-surface/60 text-left hover:border-accent/40"
              onClick={() => onOpenAlbum(album.name)}
            >
              <div className="relative aspect-square w-full bg-surface">
                {cover ? (
                  <GalleryMediaItem
                    src={cover}
                    sizes="(max-width: 768px) 50vw, 200px"
                    imageClassName="object-cover transition group-hover:opacity-95"
                    previewOnly
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-caption text-muted">
                    {t('gallery')}
                  </div>
                )}
              </div>
              <span className="px-2 py-2 text-body-sm font-weight-label text-fg">
                {album.name} ({album.items.length})
              </span>
            </button>
          );
        })}

        {showRelatedAlbum ? (
          <button
            type="button"
            className="group flex flex-col overflow-hidden rounded-btn border border-border bg-surface/60 text-left hover:border-accent/40"
            onClick={() => onOpenAlbum(RELATED_ALBUM_NAME)}
          >
            <div className="relative aspect-square w-full bg-surface">
              {relatedCoverUrl ? (
                <GalleryMediaItem
                  src={relatedCoverUrl}
                  sizes="(max-width: 768px) 50vw, 200px"
                  previewOnly
                />
              ) : (
                <div className="flex h-full items-center justify-center text-caption text-muted">
                  {t('gallery')}
                </div>
              )}
            </div>
            <span className="px-2 py-2 text-body-sm font-weight-label text-fg">
              {t('related')} ({resolvedRelatedPreview?.count ?? 0})
            </span>
          </button>
        ) : relatedPreviewLoading ? (
          <GalleryAlbumCardSkeleton />
        ) : relatedPreviewError ? (
          <div className="flex flex-col gap-2 rounded-btn border border-border bg-surface/60 p-3">
            <p className="text-body-sm text-muted">{t('gallery_load_failed')}</p>
            <button
              type="button"
              className="self-start text-body-sm font-weight-label text-accent hover:underline"
              onClick={retryRelatedPreview}
            >
              {t('gallery_try_again')}
            </button>
          </div>
        ) : null}
      </div>

      {canAddAlbum && viewerUsername ? (
        <AddUpdateModal
          mode="generic"
          open={addAlbumOpen}
          onClose={() => setAddAlbumOpen(false)}
          objectId={objectId}
          viewerUsername={viewerUsername}
          updateType={UPDATE_TYPES.IMAGE_GALLERY}
          initialValue=""
          updateTypeCounts={updateTypeCounts}
        />
      ) : null}
    </div>
  );
}
