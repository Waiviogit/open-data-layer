import { isTikTokVideoId, parseTikTokVideoId } from './video-preview';

const TIKTOK_THUMB_HOST =
  /(?:^|\.)((?:tiktokcdn(?:-us|-eu)?|muscdn)\.com)$/i;

export function isAllowedTikTokThumbnailUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return TIKTOK_THUMB_HOST.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function tiktokOembedPageUrl(videoId: string): string {
  return `https://www.tiktok.com/@placeholder/video/${videoId}`;
}

/** Client fetch of the web BFF oEmbed poster. */
export async function fetchTikTokThumbnail(videoId: string): Promise<string | null> {
  if (!isTikTokVideoId(videoId)) {
    return null;
  }
  try {
    const res = await fetch(
      `/api/video-preview/tiktok?id=${encodeURIComponent(videoId)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { thumbnailUrl?: unknown };
    const thumb = data.thumbnailUrl;
    return typeof thumb === 'string' && thumb.trim() !== '' ? thumb.trim() : null;
  } catch {
    return null;
  }
}

export function parseTikTokVideoIdFromEmbedUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  return parseTikTokVideoId(url);
}
