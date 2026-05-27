'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import type { ProjectedGalleryPhotoView } from '../../domain/object-page.types';
import {
  GALLERY_CAROUSEL_PORTRAIT_FRAME_ASPECT,
  resolveGalleryCarouselAspectRatio,
} from '../../domain/resolve-gallery-carousel-aspect-ratio';

export type ObjectGalleryCarouselProps = {
  photos: ProjectedGalleryPhotoView[];
  onPhotoClick?: (index: number) => void;
};

const CAROUSEL_CONTROL_CLASS =
  'inline-flex w-4 shrink-0 items-center justify-center self-center text-[1.75rem] leading-none text-muted transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function ObjectGalleryCarousel({ photos, onPhotoClick }: ObjectGalleryCarouselProps) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [frameAspect, setFrameAspect] = useState(GALLERY_CAROUSEL_PORTRAIT_FRAME_ASPECT);

  const count = photos.length;
  const active = photos[activeIndex];

  useEffect(() => {
    setFrameAspect(GALLERY_CAROUSEL_PORTRAIT_FRAME_ASPECT);
  }, [active?.url]);

  const goPrev = useCallback(() => {
    if (count <= 1) {
      return;
    }
    setActiveIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count <= 1) {
      return;
    }
    setActiveIndex((i) => (i + 1) % count);
  }, [count]);

  if (!active) {
    return null;
  }

  const showControls = count > 1;
  const frameClassName = [
    'relative min-w-0 flex-1 overflow-hidden rounded-btn border border-border',
    onPhotoClick ? 'cursor-pointer transition-colors hover:border-accent/40' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const photoFrame = (
    <div className="relative w-full" style={{ aspectRatio: frameAspect }}>
      <Image
        src={active.url}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 320px"
        unoptimized={shouldUnoptimizeRemoteImage(active.url)}
        onLoad={(event) => {
          const img = event.currentTarget;
          setFrameAspect(
            resolveGalleryCarouselAspectRatio(img.naturalWidth, img.naturalHeight),
          );
        }}
      />
    </div>
  );

  return (
    <div className="mt-3 flex items-center gap-0">
      {showControls ? (
        <button
          type="button"
          className={CAROUSEL_CONTROL_CLASS}
          aria-label={t('object_detail_gallery_prev')}
          onClick={goPrev}
        >
          ‹
        </button>
      ) : null}
      {onPhotoClick ? (
        <button
          type="button"
          className={frameClassName}
          aria-label={t('gallery')}
          onClick={() => onPhotoClick(activeIndex)}
        >
          {photoFrame}
        </button>
      ) : (
        <div className={frameClassName}>{photoFrame}</div>
      )}
      {showControls ? (
        <button
          type="button"
          className={CAROUSEL_CONTROL_CLASS}
          aria-label={t('object_detail_gallery_next')}
          onClick={goNext}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
