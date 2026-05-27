import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

/** Default form state for a new `imageGalleryItem` update. */
export function initialGalleryItemFormValue(
  presetAlbumName?: string,
): Record<string, unknown> {
  return {
    album: presetAlbumName ?? '',
    url: '',
    cid: '',
  };
}

/** Strip empty optional image fields before Zod validation. */
export function sanitizeGalleryItemFormValue(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  if (typeof out.cid === 'string' && out.cid.trim() === '') {
    delete out.cid;
  }
  if (typeof out.url === 'string' && out.url.trim() === '') {
    delete out.url;
  }
  return out;
}

export function initialGalleryFormValue(): string {
  return '';
}

export function isGalleryUpdateType(updateType: string): boolean {
  return (
    updateType === UPDATE_TYPES.IMAGE_GALLERY ||
    updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM
  );
}
