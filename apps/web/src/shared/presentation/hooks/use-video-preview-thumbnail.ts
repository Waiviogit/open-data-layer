'use client';

import { useEffect, useState } from 'react';

import {
  fetchThreeSpeakThumbnail,
  isBrokenThreeSpeakStaticThumbnail,
  isThreeSpeakEmbedUrl,
  parseThreeSpeakVideoIdFromEmbedUrl,
} from '@/shared/infrastructure/three-speak-preview';
import {
  fetchTikTokThumbnail,
  parseTikTokVideoIdFromEmbedUrl,
} from '@/shared/infrastructure/tiktok-preview';
import { isTikTokEmbedUrl } from '@/shared/infrastructure/video-preview';

/**
 * Resolves video preview poster: static thumbnail first, then 3Speak / TikTok when needed.
 */
export function useVideoPreviewThumbnail(
  embedUrl: string | null | undefined,
  staticThumbnailUrl: string | null | undefined,
): string | null {
  const staticVideoThumb =
    staticThumbnailUrl && !isBrokenThreeSpeakStaticThumbnail(staticThumbnailUrl)
      ? staticThumbnailUrl
      : null;
  const [fetchedThumb, setFetchedThumb] = useState<string | null>(null);
  const threeSpeakVideoId = isThreeSpeakEmbedUrl(embedUrl)
    ? parseThreeSpeakVideoIdFromEmbedUrl(embedUrl ?? '')
    : null;
  const tiktokVideoId = isTikTokEmbedUrl(embedUrl)
    ? parseTikTokVideoIdFromEmbedUrl(embedUrl)
    : null;

  useEffect(() => {
    setFetchedThumb(null);
    if (staticVideoThumb) {
      return undefined;
    }
    const fetchThumb = threeSpeakVideoId
      ? () => fetchThreeSpeakThumbnail(threeSpeakVideoId)
      : tiktokVideoId
        ? () => fetchTikTokThumbnail(tiktokVideoId)
        : null;
    if (!fetchThumb) {
      return undefined;
    }
    let cancelled = false;
    void fetchThumb().then((url) => {
      if (!cancelled) {
        setFetchedThumb(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [threeSpeakVideoId, tiktokVideoId, staticVideoThumb]);

  return fetchedThumb ?? staticVideoThumb ?? null;
}
