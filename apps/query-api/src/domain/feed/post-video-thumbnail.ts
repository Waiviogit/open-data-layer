/**
 * Video poster URL for feed preview: json_metadata.video (DTube / 3Speak), then video URLs in body.
 */

const HIVE_IMAGE_PROXY_BASE = 'https://images.hive.blog/p';

const YOUTUBE_ID_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?[^#\s]*?v=([a-zA-Z0-9_-]{11})\b/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})\b/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})\b/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})\b/,
  /m\.youtube\.com\/watch\?[^#\s]*?v=([a-zA-Z0-9_-]{11})\b/,
  /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})\b/,
];

const VIMEO_ID_PATTERN = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;

const THREE_SPEAK_WATCH_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?3speak\.tv\/watch\?v=([^&\s<>"']+)/i;

function tryParseJson(s: string): unknown | null {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string | null {
  if (url === '' || url.startsWith('data:')) {
    return null;
  }
  return url;
}

function hiveBlogProxyImage(ipfsHash: string): string | null {
  const trimmed = ipfsHash.trim();
  if (trimmed === '') {
    return null;
  }
  return `${HIVE_IMAGE_PROXY_BASE}/${encodeURIComponent(trimmed)}?format=match&mode=fit`;
}

function firstIpfsImageHashFromVideo(video: Record<string, unknown>): string | null {
  const files = video.files;
  if (typeof files !== 'object' || files === null) {
    return null;
  }
  const ipfs = (files as Record<string, unknown>).ipfs;
  if (typeof ipfs !== 'object' || ipfs === null) {
    return null;
  }
  const img = (ipfs as Record<string, unknown>).img;
  if (typeof img !== 'object' || img === null) {
    return null;
  }
  const imgObj = img as Record<string, unknown>;
  for (const key of ['480', '720', '360', '240']) {
    const h = imgObj[key];
    if (typeof h === 'string' && h.trim() !== '') {
      return h.trim();
    }
  }
  for (const val of Object.values(imgObj)) {
    if (typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  return null;
}

function videoThumbFromJsonMetadata(jsonMetadata: string): string | null {
  const parsed = tryParseJson(jsonMetadata);
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const video = (parsed as Record<string, unknown>).video;
  if (video === null || video === undefined) {
    return null;
  }
  if (typeof video !== 'object') {
    return null;
  }
  const v = video as Record<string, unknown>;

  const info = v.info;
  if (typeof info === 'object' && info !== null) {
    const snaphash = (info as Record<string, unknown>).snaphash;
    if (typeof snaphash === 'string' && snaphash.trim() !== '') {
      return hiveBlogProxyImage(snaphash.trim());
    }
  }

  const fromIpfs = firstIpfsImageHashFromVideo(v);
  if (fromIpfs) {
    return hiveBlogProxyImage(fromIpfs);
  }

  if (typeof v.thumbnail === 'string' && v.thumbnail.trim() !== '') {
    return normalizeUrl(v.thumbnail.trim());
  }
  if (typeof v.thumbnail_url === 'string' && v.thumbnail_url.trim() !== '') {
    return normalizeUrl(v.thumbnail_url.trim());
  }

  return null;
}

function extractYouTubeThumbnail(body: string): string | null {
  for (const re of YOUTUBE_ID_PATTERNS) {
    const m = body.match(re);
    if (m?.[1]) {
      return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
    }
  }
  return null;
}

function extractVimeoThumbnail(body: string): string | null {
  const m = body.match(VIMEO_ID_PATTERN);
  if (!m?.[1]) {
    return null;
  }
  return `https://vumbnail.com/${m[1]}.jpg`;
}

function extractThreeSpeakThumbnail(body: string): string | null {
  const m = body.match(THREE_SPEAK_WATCH_PATTERN);
  if (!m?.[1]) {
    return null;
  }
  let path: string;
  try {
    path = decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    path = m[1];
  }
  const trimmed = path.trim();
  if (trimmed === '' || trimmed.includes('..')) {
    return null;
  }
  return `https://img.3speakcontent.co/${trimmed}/post.png`;
}

function videoThumbFromBody(body: string): string | null {
  const youtube = extractYouTubeThumbnail(body);
  if (youtube) {
    return youtube;
  }
  const vimeo = extractVimeoThumbnail(body);
  if (vimeo) {
    return vimeo;
  }
  return extractThreeSpeakThumbnail(body);
}

/**
 * Returns a poster/thumbnail URL for embedded video when detectable, else null.
 * Does not fetch remote resources; URLs are deterministic from metadata or body.
 */
export function extractVideoThumbnailUrl(jsonMetadata: string, body: string): string | null {
  const fromMeta = videoThumbFromJsonMetadata(jsonMetadata);
  if (fromMeta) {
    return fromMeta;
  }
  return videoThumbFromBody(body);
}
