import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { normalizeImageCidOrUrlFormValue } from './image-form-value';

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
  if (typeof out.album === 'string') {
    out.album = out.album.trim();
  }
  const image = normalizeImageCidOrUrlFormValue({
    cid: out.cid,
    url: out.url,
  });
  delete out.cid;
  delete out.url;
  return { ...out, ...image };
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
