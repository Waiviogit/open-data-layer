'use client';

import { useMemo, useState } from 'react';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { AddUpdateModal } from '@/modules/object-updates/presentation/components/add-update-modal';
import { initialGalleryItemFormValue } from '@/modules/object-updates/application/gallery-form-value';

import type { ProjectedGalleryAlbumView } from '../../domain/object-page.types';
import { GalleryImage } from './gallery-image';

export type ObjectGalleryTabContentProps = {
  objectId: string;
  objectName: string;
  galleryAlbums: ProjectedGalleryAlbumView[];
  activeAlbumName: string | null;
  viewerUsername: string | null;
  onRequireLogin: () => void;
  supportedUpdateTypes: readonly string[];
  updateTypeCounts?: Record<string, number>;
  onOpenAlbum: (albumName: string) => void;
  onBackToAlbums: () => void;
  /** Opens full-screen viewer on the object page layer (outside scrollable gallery grid). */
  onOpenPhoto?: (album: ProjectedGalleryAlbumView, photoIndex: number) => void;
};

function albumCoverUrl(album: ProjectedGalleryAlbumView): string | null {
  return album.items[0]?.url ?? null;
}

export function ObjectGalleryTabContent({
  objectId,
  objectName,
  galleryAlbums,
  activeAlbumName,
  viewerUsername,
  onRequireLogin,
  supportedUpdateTypes,
  updateTypeCounts,
  onOpenAlbum,
  onBackToAlbums,
  onOpenPhoto,
}: ObjectGalleryTabContentProps) {
  const { t } = useI18n();
  const [addAlbumOpen, setAddAlbumOpen] = useState(false);
  const [addImageOpen, setAddImageOpen] = useState(false);

  const canAddAlbum = supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE_GALLERY);
  const canAddImage = supportedUpdateTypes.includes(UPDATE_TYPES.IMAGE_GALLERY_ITEM);
  const albumNames = useMemo(
    () => galleryAlbums.map((album) => album.name),
    [galleryAlbums],
  );

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
                    onClick={() => onOpenPhoto?.(album, index)}
                  >
                    <GalleryImage
                      src={photo.url}
                      sizes="(max-width: 768px) 50vw, 320px"
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
            initialValue={initialGalleryItemFormValue(activeAlbumName ?? undefined)}
            galleryAlbumNames={albumNames}
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
                  <GalleryImage
                    src={cover}
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover transition group-hover:opacity-95"
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

        <div
          className="flex flex-col overflow-hidden rounded-btn border border-border bg-surface/40 opacity-70"
          aria-hidden
        >
          <div className="relative aspect-square w-full bg-surface/80" />
          <span className="px-2 py-2 text-body-sm font-weight-label text-muted">
            {t('related')} (0)
          </span>
        </div>
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
