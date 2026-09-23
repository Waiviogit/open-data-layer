'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getImagePathPost } from '@/shared/infrastructure/image/get-proxy-image-url';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation/image/should-unoptimize-remote-image';

type CoverLoadPhase = 'raw' | 'proxy' | 'hidden';

export type UserHeroCoverImageProps = {
  coverImageUrl: string;
  priority?: boolean;
};

export function UserHeroCoverImage({
  coverImageUrl,
  priority = false,
}: UserHeroCoverImageProps) {
  const normalizedRaw = useMemo(() => coverImageUrl.trim(), [coverImageUrl]);
  const proxySrc = useMemo(
    () => (normalizedRaw ? getImagePathPost(normalizedRaw) : ''),
    [normalizedRaw],
  );
  const hasProxyFallback = Boolean(
    normalizedRaw && proxySrc && proxySrc !== normalizedRaw,
  );

  const [phase, setPhase] = useState<CoverLoadPhase>('raw');

  useEffect(() => {
    setPhase('raw');
  }, [normalizedRaw]);

  const displaySrc = phase === 'proxy' ? proxySrc : normalizedRaw;

  const onError = useCallback(() => {
    if (phase === 'raw' && hasProxyFallback) {
      setPhase('proxy');
      return;
    }
    setPhase('hidden');
  }, [hasProxyFallback, phase]);

  if (phase === 'hidden' || !displaySrc) {
    return null;
  }

  return (
    <Image
      src={displaySrc}
      alt=""
      fill
      priority={priority}
      sizes="100vw"
      className="object-cover"
      unoptimized={shouldUnoptimizeRemoteImage(displaySrc)}
      onError={onError}
    />
  );
}
