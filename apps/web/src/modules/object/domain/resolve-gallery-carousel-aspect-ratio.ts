const PORTRAIT_FRAME_ASPECT = 3 / 4;
const MAX_LANDSCAPE_FRAME_ASPECT = 16 / 9;

/** Portrait keeps legacy 3:4 crop; square/landscape use natural ratio (capped). */
export function resolveGalleryCarouselAspectRatio(
  naturalWidth: number,
  naturalHeight: number,
): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return PORTRAIT_FRAME_ASPECT;
  }
  const ratio = naturalWidth / naturalHeight;
  if (ratio >= 1) {
    return Math.min(MAX_LANDSCAPE_FRAME_ASPECT, ratio);
  }
  return PORTRAIT_FRAME_ASPECT;
}

export const GALLERY_CAROUSEL_PORTRAIT_FRAME_ASPECT = PORTRAIT_FRAME_ASPECT;
