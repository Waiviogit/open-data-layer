import {
  isThreeSpeakEmbedUrl,
  parseThreeSpeakVideoIdFromEmbedUrl,
} from './three-speak-preview';

export type VideoPreviewProvider =
  | 'youtube'
  | 'vimeo'
  | '3speak'
  | 'dtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'linkedin';

export type VideoPreviewLayout = 'landscape' | 'portrait' | 'widget';

const NATIVE_FEED_PROVIDERS: ReadonlySet<VideoPreviewProvider> = new Set([
  'tiktok',
  'instagram',
  'facebook',
  'x',
  'linkedin',
]);

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

const INSTAGRAM_POST =
  /(?:www\.)?instagram\.com\/(p|reels?|tv)\/([A-Za-z0-9_-]+)(?:\/(?:embed(?:\/captioned)?)?)?(?:[/?#].*)?/i;

const FACEBOOK_REEL = /(?:www\.|m\.)?facebook\.com\/reels?\/(\d+)\b/i;
const FACEBOOK_VIDEOS = /(?:www\.|m\.)?facebook\.com\/[^/\s"'<>]+\/videos\/(\d+)\b/i;
const FACEBOOK_WATCH = /(?:www\.|m\.)?facebook\.com\/watch\/?\?[^#\s"'<>]*\bv=(\d+)/i;
const FB_WATCH_SHORT = /(?:www\.)?fb\.watch\/([A-Za-z0-9_-]+)\b/i;

const X_STATUS =
  /(?:www\.|mobile\.)?(?:twitter|x)\.com\/(?:[A-Za-z0-9_]+|i)\/status\/(\d{10,20})\b/i;
const X_EMBED = /platform\.twitter\.com\/embed\/Tweet\.html\?[^#\s"'<>]*\bid=(\d{10,20})/i;

const LINKEDIN_URN =
  /(?:www\.)?linkedin\.com\/(?:embed\/)?feed\/update\/urn:li:(activity|ugcPost|share):(\d{10,20})/i;
const LINKEDIN_POSTS =
  /(?:www\.)?linkedin\.com\/posts\/[^/\s"'<>?#]*activity-(\d{10,20})/i;

/** Excerpt truncation (`…` / `%E2%80%A6`) must not become part of the path. */
export function stripUrlTruncation(url: string): string {
  return url.replace(/%E2%80%A6/gi, '').replace(/\u2026/g, '');
}

function normalizeUrl(url: string): string {
  let trimmed = stripUrlTruncation(url.trim());
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

export function isNativeFeedVideoUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  const parsed = parseVideoUrl(url);
  return parsed != null && NATIVE_FEED_PROVIDERS.has(parsed.provider);
}

export function isNativeFeedVideoProvider(
  provider: VideoPreviewProvider | null | undefined,
): boolean {
  return provider != null && NATIVE_FEED_PROVIDERS.has(provider);
}

/** Legacy Waivio iframe player URL (`embedMedia.js` / `videoHelper.js`). */
export function buildThreeSpeakEmbedUrl(videoId: string): string {
  return `https://play.3speak.tv/watch?v=${encodeURIComponent(videoId)}&mode=iframe&layout=desktop`;
}

export function buildTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}`;
}

export function buildInstagramEmbedUrl(kind: string, code: string): string {
  return `https://www.instagram.com/${kind}/${code}/embed`;
}

export function buildFacebookEmbedUrl(shareUrl: string): string {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(shareUrl)}&show_text=false`;
}

export function buildXEmbedUrl(statusId: string): string {
  return `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`;
}

export function buildLinkedInEmbedUrl(kind: string, activityId: string): string {
  return `https://www.linkedin.com/embed/feed/update/urn:li:${kind}:${activityId}`;
}

function canonicalizeInstagramKind(kind: string): 'p' | 'reel' | 'tv' | null {
  const lower = kind.toLowerCase();
  if (lower === 'p' || lower === 'tv') {
    return lower;
  }
  if (lower === 'reel' || lower === 'reels') {
    return 'reel';
  }
  return null;
}

function parseInstagramPreview(url: string): ParsedVideoPreview | null {
  const m = url.match(INSTAGRAM_POST);
  const kind = m?.[1] ? canonicalizeInstagramKind(m[1]) : null;
  const code = m?.[2];
  if (!kind || !code) {
    return null;
  }
  return {
    provider: 'instagram',
    videoId: `${kind}/${code}`,
    embedUrl: buildInstagramEmbedUrl(kind, code),
    thumbnailUrl: null,
    layout: 'widget',
  };
}

function facebookShareUrlFromPlugin(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^(?:www|m)\./i, '');
    if (host !== 'facebook.com' || !parsed.pathname.includes('/plugins/video.php')) {
      return null;
    }
    const href = parsed.searchParams.get('href');
    return href && /^https?:\/\//i.test(href) ? href : null;
  } catch {
    return null;
  }
}

function parseFacebookPreview(url: string): ParsedVideoPreview | null {
  const pluginHref = facebookShareUrlFromPlugin(url);
  const source = pluginHref ?? url;
  const reel = source.match(FACEBOOK_REEL);
  if (reel?.[1]) {
    const shareUrl = `https://www.facebook.com/reel/${reel[1]}`;
    return {
      provider: 'facebook',
      videoId: shareUrl,
      embedUrl: buildFacebookEmbedUrl(shareUrl),
      thumbnailUrl: null,
      layout: 'portrait',
    };
  }
  const videos = source.match(FACEBOOK_VIDEOS);
  const watch = source.match(FACEBOOK_WATCH);
  const videoId = videos?.[1] ?? watch?.[1];
  if (videoId) {
    const shareUrl = `https://www.facebook.com/watch/?v=${videoId}`;
    return {
      provider: 'facebook',
      videoId: shareUrl,
      embedUrl: buildFacebookEmbedUrl(shareUrl),
      thumbnailUrl: null,
      layout: 'landscape',
    };
  }
  const short = source.match(FB_WATCH_SHORT);
  if (short?.[1]) {
    const shareUrl = `https://fb.watch/${short[1]}`;
    return {
      provider: 'facebook',
      videoId: shareUrl,
      embedUrl: buildFacebookEmbedUrl(shareUrl),
      thumbnailUrl: null,
      layout: 'landscape',
    };
  }
  if (pluginHref) {
    return {
      provider: 'facebook',
      videoId: pluginHref,
      embedUrl: buildFacebookEmbedUrl(pluginHref),
      thumbnailUrl: null,
      layout: /\/reels?\//i.test(pluginHref) ? 'portrait' : 'landscape',
    };
  }
  return null;
}

function parseXPreview(url: string): ParsedVideoPreview | null {
  const embed = url.match(X_EMBED);
  const status = url.match(X_STATUS);
  const statusId = embed?.[1] ?? status?.[1];
  if (!statusId) {
    return null;
  }
  return {
    provider: 'x',
    videoId: statusId,
    embedUrl: buildXEmbedUrl(statusId),
    thumbnailUrl: null,
    layout: 'widget',
  };
}

function parseLinkedInPreview(url: string): ParsedVideoPreview | null {
  const urn = url.match(LINKEDIN_URN);
  const kind = urn?.[1]?.toLowerCase();
  const urnId = urn?.[2];
  if (
    (kind === 'activity' || kind === 'ugcpost' || kind === 'share') &&
    urnId
  ) {
    const canonicalKind = kind === 'ugcpost' ? 'ugcPost' : kind;
    return {
      provider: 'linkedin',
      videoId: `${canonicalKind}:${urnId}`,
      embedUrl: buildLinkedInEmbedUrl(canonicalKind, urnId),
      thumbnailUrl: null,
      layout: 'widget',
    };
  }
  const posts = url.match(LINKEDIN_POSTS);
  const postId = posts?.[1];
  if (!postId) {
    return null;
  }
  return {
    provider: 'linkedin',
    videoId: `activity:${postId}`,
    embedUrl: buildLinkedInEmbedUrl('activity', postId),
    thumbnailUrl: null,
    layout: 'widget',
  };
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

  const instagram = parseInstagramPreview(normalized);
  if (instagram) {
    return instagram;
  }

  const facebook = parseFacebookPreview(normalized);
  if (facebook) {
    return facebook;
  }

  const xPreview = parseXPreview(normalized);
  if (xPreview) {
    return xPreview;
  }

  const linkedIn = parseLinkedInPreview(normalized);
  if (linkedIn) {
    return linkedIn;
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
    case 'instagram': {
      const [kind, code] = preview.videoId.split('/');
      return kind && code ? buildInstagramEmbedUrl(kind, code) : preview.embedUrl;
    }
    case 'facebook':
      return buildFacebookEmbedUrl(preview.videoId);
    case 'x':
      return buildXEmbedUrl(preview.videoId);
    case 'linkedin': {
      const [kind, id] = preview.videoId.split(':');
      return kind && id ? buildLinkedInEmbedUrl(kind, id) : preview.embedUrl;
    }
    default: {
      const _exhaustive: never = preview.provider;
      return _exhaustive;
    }
  }
}
