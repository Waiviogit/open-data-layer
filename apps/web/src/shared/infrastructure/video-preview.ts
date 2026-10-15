import {
  isThreeSpeakEmbedUrl,
  parseThreeSpeakVideoIdFromEmbedUrl,
} from './three-speak-preview';

export type VideoPreviewProvider = 'youtube' | 'vimeo' | '3speak' | 'dtube' | 'tiktok';

export type VideoPreviewLayout = 'landscape' | 'portrait';

export type ParsedVideoPreview = {
  provider: VideoPreviewProvider;
  embedUrl: string;
  thumbnailUrl: string | null;
  videoId: string;
  layout: VideoPreviewLayout;
};

const YOUTUBE_SHORTS_PATTERNS: RegExp[] = [
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})\b/,
  /m\.youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})\b/,
];

const YOUTUBE_ID_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?[^#\s]*?v=([a-zA-Z0-9_-]{11})\b/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})\b/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})\b/,
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})\b/,
  /m\.youtube\.com\/watch\?[^#\s]*?v=([a-zA-Z0-9_-]{11})\b/,
  /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})\b/,
];

/** Public id, optional unlisted privacy hash (`vimeo.com/{id}/{hash}`). */
const VIMEO_ID_PATTERN =
  /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)(?:\/([A-Za-z0-9]+))?/;

const THREE_SPEAK_BODY_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?3speak\.(?:tv|online)\/(?:watch|embed)\?[^"'\s]*\bv=([^&\s<>"')]+)/i;

const DTUBE_URL_PATTERN =
  /https?:\/\/(?:emb\.)?d\.tube(?:\/#!)?(?:\/v)?\/([^/\s"'<>]+\/[^/\s"'<>]+)/i;

const TIKTOK_VIDEO_ID = /(\d{10,20})\b/;

const TIKTOK_SHARE_PATTERN = new RegExp(
  `(?:www\\.)?tiktok\\.com/@[^/\\s"'<>]+/video/${TIKTOK_VIDEO_ID.source}`,
  'i',
);

const TIKTOK_PLAYER_PATTERN = new RegExp(
  `(?:www\\.)?tiktok\\.com/(?:player/v1|embed/v2)/${TIKTOK_VIDEO_ID.source}`,
  'i',
);

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

function extractYouTubeShortsId(url: string): string | null {
  for (const re of YOUTUBE_SHORTS_PATTERNS) {
    const m = url.match(re);
    if (m?.[1]) {
      return m[1];
    }
  }
  return null;
}

function extractYouTubeId(url: string): string | null {
  for (const re of YOUTUBE_ID_PATTERNS) {
    const m = url.match(re);
    if (m?.[1]) {
      return m[1];
    }
  }
  return null;
}

function extractVimeoRef(url: string): { id: string; hash: string | null } | null {
  const m = url.match(VIMEO_ID_PATTERN);
  if (!m?.[1]) {
    return null;
  }
  const pathHash = m[2]?.trim() || null;
  if (pathHash) {
    return { id: m[1], hash: pathHash };
  }
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return { id: m[1], hash: parsed.searchParams.get('h') };
  } catch {
    return { id: m[1], hash: null };
  }
}

function decodeThreeSpeakVideoId(raw: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch {
    path = raw;
  }
  const trimmed = path.trim();
  if (trimmed === '' || trimmed.includes('..')) {
    return null;
  }
  return trimmed;
}

function extractThreeSpeakVideoId(url: string): string | null {
  if (isThreeSpeakEmbedUrl(url)) {
    return parseThreeSpeakVideoIdFromEmbedUrl(url);
  }
  const m = url.match(THREE_SPEAK_BODY_PATTERN);
  if (!m?.[1]) {
    return null;
  }
  return decodeThreeSpeakVideoId(m[1]);
}

function extractDTubeVideoId(url: string): string | null {
  const m = url.match(DTUBE_URL_PATTERN);
  if (!m?.[1]) {
    return null;
  }
  const parts = m[1].split('/');
  const author = parts[0]?.trim();
  const permlink = parts[1]?.trim();
  if (!author || !permlink) {
    return null;
  }
  return `${author}/${permlink}`;
}

export function isTikTokVideoId(value: string): boolean {
  return /^\d{10,20}$/.test(value);
}

export function parseTikTokVideoId(url: string): string | null {
  const normalized = normalizeUrl(url);
  const player = normalized.match(TIKTOK_PLAYER_PATTERN);
  if (player?.[1] && isTikTokVideoId(player[1])) {
    return player[1];
  }
  const share = normalized.match(TIKTOK_SHARE_PATTERN);
  if (share?.[1] && isTikTokVideoId(share[1])) {
    return share[1];
  }
  return null;
}

export function isTikTokEmbedUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  return parseTikTokVideoId(url) !== null;
}

/** Legacy Waivio iframe player URL (`embedMedia.js` / `videoHelper.js`). */
export function buildThreeSpeakEmbedUrl(videoId: string): string {
  return `https://play.3speak.tv/watch?v=${encodeURIComponent(videoId)}&mode=iframe&layout=desktop`;
}

export function buildTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}`;
}

function buildYouTubeEmbedUrl(videoId: string, autoplay: boolean): string {
  const params = autoplay ? '?autoplay=1&rel=0' : '';
  return `https://www.youtube.com/embed/${videoId}${params}`;
}

function buildVimeoEmbedUrl(
  videoId: string,
  autoplay: boolean,
  privacyHash?: string | null,
): string {
  const params = new URLSearchParams();
  if (privacyHash) {
    params.set('h', privacyHash);
  }
  if (autoplay) {
    params.set('autoplay', '1');
  }
  const qs = params.toString();
  return `https://player.vimeo.com/video/${videoId}${qs ? `?${qs}` : ''}`;
}

function vimeoPrivacyHashFromEmbed(embedUrl: string): string | null {
  const query = embedUrl.split('?')[1];
  if (!query) {
    return null;
  }
  return new URLSearchParams(query).get('h');
}

function buildDTubeEmbedUrl(videoId: string): string {
  const [author, permlink] = videoId.split('/');
  return `https://emb.d.tube/#!/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}`;
}

function youtubePreview(videoId: string, layout: VideoPreviewLayout): ParsedVideoPreview {
  return {
    provider: 'youtube',
    videoId,
    embedUrl: buildYouTubeEmbedUrl(videoId, false),
    thumbnailUrl:
      layout === 'portrait'
        ? `https://i.ytimg.com/vi/${videoId}/oar2.jpg`
        : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    layout,
  };
}

/**
 * Returns embed + poster metadata when `url` is a supported video link.
 * Does not fetch remote resources.
 */
export function parseVideoUrl(url: string): ParsedVideoPreview | null {
  const normalized = normalizeUrl(url);
  if (normalized === '') {
    return null;
  }

  const youtubeShortsId = extractYouTubeShortsId(normalized);
  if (youtubeShortsId) {
    return youtubePreview(youtubeShortsId, 'portrait');
  }

  const youtubeId = extractYouTubeId(normalized);
  if (youtubeId) {
    return youtubePreview(youtubeId, 'landscape');
  }

  const vimeo = extractVimeoRef(normalized);
  if (vimeo) {
    return {
      provider: 'vimeo',
      videoId: vimeo.id,
      embedUrl: buildVimeoEmbedUrl(vimeo.id, false, vimeo.hash),
      thumbnailUrl: `https://vumbnail.com/${vimeo.id}.jpg`,
      layout: 'landscape',
    };
  }

  const threeSpeakId = extractThreeSpeakVideoId(normalized);
  if (threeSpeakId) {
    return {
      provider: '3speak',
      videoId: threeSpeakId,
      embedUrl: buildThreeSpeakEmbedUrl(threeSpeakId),
      thumbnailUrl: null,
      layout: 'landscape',
    };
  }

  const dtubeId = extractDTubeVideoId(normalized);
  if (dtubeId) {
    return {
      provider: 'dtube',
      videoId: dtubeId,
      embedUrl: buildDTubeEmbedUrl(dtubeId),
      thumbnailUrl: null,
      layout: 'landscape',
    };
  }

  const tiktokId = parseTikTokVideoId(normalized);
  if (tiktokId) {
    return {
      provider: 'tiktok',
      videoId: tiktokId,
      embedUrl: buildTikTokEmbedUrl(tiktokId),
      thumbnailUrl: null,
      layout: 'portrait',
    };
  }

  return null;
}

export function buildVideoEmbedUrl(
  preview: ParsedVideoPreview,
  options?: { autoplay?: boolean },
): string {
  const autoplay = options?.autoplay ?? false;
  switch (preview.provider) {
    case 'youtube':
      return buildYouTubeEmbedUrl(preview.videoId, autoplay);
    case 'vimeo':
      return buildVimeoEmbedUrl(
        preview.videoId,
        autoplay,
        vimeoPrivacyHashFromEmbed(preview.embedUrl),
      );
    case '3speak':
      return buildThreeSpeakEmbedUrl(preview.videoId);
    case 'dtube':
      return buildDTubeEmbedUrl(preview.videoId);
    case 'tiktok':
      return buildTikTokEmbedUrl(preview.videoId);
    default: {
      const _exhaustive: never = preview.provider;
      return _exhaustive;
    }
  }
}
