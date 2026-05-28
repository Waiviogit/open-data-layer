'use client';

import Image from 'next/image';
import { useEffect, useState, type SyntheticEvent } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import { GalleryImageFailedState } from './gallery-image-failed-state';

export type GalleryImageProps = {
  src: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

/**
 * Gallery grid / full-view image with a styled fallback when the remote URL fails
 * (CDN 404, hotlink block, expired asset).
 */
export function GalleryImage({
  src,
  className = 'object-cover',
  sizes,
  priority = false,
  onLoad,
}: GalleryImageProps) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return <GalleryImageFailedState message={t('gallery_image_failed_to_load')} />;
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={shouldUnoptimizeRemoteImage(src)}
      onLoad={onLoad}
      onError={() => setFailed(true)}
    />
  );
}
