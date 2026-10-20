/**
 * Video poster URL for feed preview: json_metadata.video (DTube / 3Speak), then video URLs in body.
 */

const HIVE_IMAGE_PROXY_BASE = 'https://images.hive.blog/p';

const YOUTUBE_SHORTS_PATTERN = /(?:m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})\b/;

const YOUTUBE_ID_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?[^#\s]*?v=([a-zA-Z0-9_-]{11})\b/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})\b/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})\b/,
  YOUTUBE_SHORTS_PATTERN,
  /m\.youtube\.com\/watch\?[^#\s]*?v=([a-zA-Z0-9_-]{11})\b/,
  /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})\b/,
];

const TIKTOK_VIDEO_PATTERN =
  /(?:www\.)?tiktok\.com\/@[^/\s"'<>]+\/video\/(\d{10,20})\b/i;

const TIKTOK_PLAYER_PATTERN =
  /(?:www\.)?tiktok\.com\/(?:player\/v1|embed\/v2)\/(\d{10,20})\b/i;

const INSTAGRAM_POST =
  /(?:www\.)?instagram\.com\/(p|reels?|tv)\/([A-Za-z0-9_-]+)/i;
const FACEBOOK_REEL = /(?:www\.|m\.)?facebook\.com\/reels?\/(\d+)\b/i;
const FACEBOOK_VIDEOS =
  /(?:www\.|m\.)?facebook\.com\/[^/\s"'<>]+\/videos\/(\d+)\b/i;
const FACEBOOK_WATCH =
  /(?:www\.|m\.)?facebook\.com\/watch\/?\?[^#\s"'<>]*\bv=(\d+)/i;
const FB_WATCH_SHORT = /(?:www\.)?fb\.watch\/([A-Za-z0-9_-]+)\b/i;
const X_STATUS =
  /(?:www\.|mobile\.)?(?:twitter|x)\.com\/(?:[A-Za-z0-9_]+|i)\/status\/(\d{10,20})\b/i;
const X_EMBED =
  /platform\.twitter\.com\/embed\/Tweet\.html\?[^#\s"'<>]*\bid=(\d{10,20})/i;
const LINKEDIN_URN =
  /(?:www\.)?linkedin\.com\/(?:embed\/)?feed\/update\/urn:li:(activity|ugcPost|share):(\d{10,20})/i;
const LINKEDIN_POSTS =
  /(?:www\.)?linkedin\.com\/posts\/[^/\s"'<>?#]*activity-(\d{10,20})/i;

const VIMEO_ID_PATTERN = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;

const THREE_SPEAK_BODY_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?3speak\.(?:tv|online)\/(?:watch|embed)\?[^"'\s]*\bv=([^&\s<>"')]+)/i;

const CENTER_BLOCK_PATTERN = /<center>([\s\S]*?)<\/center>/i;

const DTUBE_URL_PATTERN =
  /https?:\/\/(?:emb\.)?d\.tube(?:\/#!)?(?:\/v)?\/([^/\s"'<>]+\/[^/\s"'<>]+)/i;

const MARKDOWN_LINKED_IMG = /!\[[^\]]*]\(\s*([^)\s]+)\s*\)/;
const HTML_IMG = /<img[^>]+src=["']([^"']+)["']/i;
const MARKDOWN_LINKED_VIDEO = /\]\((https?:\/\/[^)\s]+)\)/;

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

function youtubeThumbnailUrl(videoId: string, portrait: boolean): string {
  return portrait
    ? `https://i.ytimg.com/vi/${videoId}/oar2.jpg`
    : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function extractYouTubeThumbnail(body: string): string | null {
  const shorts = body.match(YOUTUBE_SHORTS_PATTERN);
  if (shorts?.[1]) {
    return youtubeThumbnailUrl(shorts[1], true);
  }
  for (const re of YOUTUBE_ID_PATTERNS) {
    const m = body.match(re);
    if (m?.[1]) {
      return youtubeThumbnailUrl(m[1], false);
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

function extractThreeSpeakVideoIdFromBody(body: string): string | null {
  const m = body.match(THREE_SPEAK_BODY_PATTERN);
  if (!m?.[1]) {
    return null;
  }
  return decodeThreeSpeakVideoId(m[1]);
}

function extractCenterBlockContent(body: string): string | null {
  const m = body.match(CENTER_BLOCK_PATTERN);
  const content = m?.[1]?.trim();
  return content && content !== '' ? content : null;
}

function extractFirstImageFromFragment(fragment: string): string | null {
  const md = fragment.match(MARKDOWN_LINKED_IMG);
  if (md?.[1]) {
    return normalizeUrl(md[1].trim());
  }
  const html = fragment.match(HTML_IMG);
  if (html?.[1]) {
    return normalizeUrl(html[1].trim());
  }
  return null;
}

function extractVideoUrlFromCenterBlock(body: string): string | null {
  const center = extractCenterBlockContent(body);
  if (!center) {
    return null;
  }

  const threeSpeak = center.match(THREE_SPEAK_BODY_PATTERN);
  if (threeSpeak?.[0]) {
    return threeSpeak[0];
  }

  const dtube = center.match(DTUBE_URL_PATTERN);
  if (dtube?.[0]) {
    return dtube[0];
  }

  for (const re of YOUTUBE_ID_PATTERNS) {
    const m = center.match(re);
    if (m?.[0]) {
      return m[0];
    }
  }

  const vimeo = center.match(VIMEO_ID_PATTERN);
  if (vimeo?.[0]) {
    return vimeo[0];
  }

  const tiktokPlayer = center.match(TIKTOK_PLAYER_PATTERN);
  if (tiktokPlayer?.[0]) {
    return tiktokPlayer[0];
  }
  const tiktokShare = center.match(TIKTOK_VIDEO_PATTERN);
  if (tiktokShare?.[0]) {
    return tiktokShare[0];
  }

  const linked = center.match(MARKDOWN_LINKED_VIDEO);
  if (linked?.[1]) {
    return linked[1].trim();
  }

  return null;
}

function videoThumbFromCenterBlock(body: string): string | null {
  const center = extractCenterBlockContent(body);
  if (!center) {
    return null;
  }
  return extractFirstImageFromFragment(center);
}

/** Legacy Waivio iframe player URL (`embedMedia.js` / `videoHelper.js`). */
export function buildThreeSpeakEmbedUrl(videoId: string): string {
  return `https://play.3speak.tv/watch?v=${encodeURIComponent(videoId)}&mode=iframe&layout=desktop`;
}

/** 3Speak posters are fetched client-side from `play.3speak.tv/api/watch` (see legacy FeedItem). */
function extractThreeSpeakThumbnail(_body: string): string | null {
  return null;
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
  const fromCenter = videoThumbFromCenterBlock(body);
  if (fromCenter) {
    return fromCenter;
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

const YOUTUBE_THUMB_HOST = /img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})\//;

function extractYouTubeIdFromBody(body: string): string | null {
  for (const re of YOUTUBE_ID_PATTERNS) {
    const m = body.match(re);
    if (m?.[1]) {
      return m[1];
    }
  }
  return null;
}

function extractYouTubeShortsIdFromBody(body: string): string | null {
  const m = body.match(YOUTUBE_SHORTS_PATTERN);
  return m?.[1] ?? null;
}

function extractTikTokVideoIdFromBody(body: string): string | null {
  const player = body.match(TIKTOK_PLAYER_PATTERN);
  if (player?.[1]) {
    return player[1];
  }
  const share = body.match(TIKTOK_VIDEO_PATTERN);
  return share?.[1] ?? null;
}

function buildTikTokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}`;
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

function buildInstagramEmbedUrl(kind: string, code: string): string {
  return `https://www.instagram.com/${kind}/${code}/embed`;
}

function buildFacebookEmbedUrl(shareUrl: string): string {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(shareUrl)}&show_text=false`;
}

function buildXEmbedUrl(statusId: string): string {
  return `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`;
}

function buildLinkedInEmbedUrl(kind: string, activityId: string): string {
  return `https://www.linkedin.com/embed/feed/update/urn:li:${kind}:${activityId}`;
}

function extractInstagramEmbedFromBody(body: string): string | null {
  const m = body.match(INSTAGRAM_POST);
  const kind = m?.[1] ? canonicalizeInstagramKind(m[1]) : null;
  const code = m?.[2];
  if (!kind || !code) {
    return null;
  }
  return buildInstagramEmbedUrl(kind, code);
}

function extractFacebookEmbedFromBody(body: string): string | null {
  const plugin = body.match(
    /https?:\/\/(?:www\.)?facebook\.com\/plugins\/video\.php\?[^#\s"'<>]+/i,
  );
  if (plugin?.[0]) {
    try {
      const href = new URL(plugin[0]).searchParams.get('href');
      if (href && /^https?:\/\//i.test(href)) {
        return buildFacebookEmbedUrl(href);
      }
    } catch {
      return plugin[0];
    }
  }
  const reel = body.match(FACEBOOK_REEL);
  if (reel?.[1]) {
    return buildFacebookEmbedUrl(`https://www.facebook.com/reel/${reel[1]}`);
  }
  const videos = body.match(FACEBOOK_VIDEOS);
  const watch = body.match(FACEBOOK_WATCH);
  const videoId = videos?.[1] ?? watch?.[1];
  if (videoId) {
    return buildFacebookEmbedUrl(`https://www.facebook.com/watch/?v=${videoId}`);
  }
  const short = body.match(FB_WATCH_SHORT);
  if (short?.[1]) {
    return buildFacebookEmbedUrl(`https://fb.watch/${short[1]}`);
  }
  return null;
}

function extractXEmbedFromBody(body: string): string | null {
  const embed = body.match(X_EMBED);
  const status = body.match(X_STATUS);
  const statusId = embed?.[1] ?? status?.[1];
  return statusId ? buildXEmbedUrl(statusId) : null;
}

function extractLinkedInEmbedFromBody(body: string): string | null {
  const urn = body.match(LINKEDIN_URN);
  const kind = urn?.[1]?.toLowerCase();
  const id = urn?.[2];
  if (
    (kind === 'activity' || kind === 'ugcpost' || kind === 'share') &&
    id
  ) {
    const canonicalKind = kind === 'ugcpost' ? 'ugcPost' : kind;
    return buildLinkedInEmbedUrl(canonicalKind, id);
  }
  const posts = body.match(LINKEDIN_POSTS);
  return posts?.[1] ? buildLinkedInEmbedUrl('activity', posts[1]) : null;
}

function extractSocialEmbedFromText(text: string): string | null {
  return (
    extractInstagramEmbedFromBody(text) ??
    extractFacebookEmbedFromBody(text) ??
    extractXEmbedFromBody(text) ??
    extractLinkedInEmbedFromBody(text)
  );
}

function extractYouTubeIdFromThumbnailUrl(url: string): string | null {
  const m = url.match(YOUTUBE_THUMB_HOST);
  return m?.[1] ?? null;
}

function extractVimeoIdFromBody(body: string): string | null {
  const m = body.match(VIMEO_ID_PATTERN);
  return m?.[1] ?? null;
}

function embedFromJsonMetadataVideo(
  jsonMetadata: string,
  postAuthor: string,
  postPermlink: string,
): string | null {
  const parsed = tryParseJson(jsonMetadata);
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const video = (parsed as Record<string, unknown>).video;
  if (video === null || video === undefined || typeof video !== 'object') {
    return null;
  }
  const v = video as Record<string, unknown>;
  const info = typeof v.info === 'object' && v.info !== null ? (v.info as Record<string, unknown>) : null;

  let author = postAuthor;
  let permlink = postPermlink;
  if (info) {
    if (typeof info.author === 'string' && info.author.trim() !== '') {
      author = info.author.trim();
    }
    if (typeof info.permlink === 'string' && info.permlink.trim() !== '') {
      permlink = info.permlink.trim();
    }
    const platform = info.platform;
    if (typeof platform === 'string' && platform.toLowerCase().includes('3speak')) {
      return buildThreeSpeakEmbedUrl(`${author}/${permlink}`);
    }
  }

  const content = v.content;
  const videohash =
    typeof content === 'object' &&
    content !== null &&
    typeof (content as Record<string, unknown>).videohash === 'string'
      ? ((content as Record<string, unknown>).videohash as string).trim()
      : '';
  const snaphash =
    info && typeof info.snaphash === 'string' ? info.snaphash.trim() : '';

  if (videohash !== '' || snaphash !== '') {
    return `https://emb.d.tube/#!/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}`;
  }

  return null;
}

function embedFromBody(body: string): string | null {
  const shorts = extractYouTubeShortsIdFromBody(body);
  if (shorts) {
    return `https://www.youtube.com/shorts/${shorts}`;
  }
  const yt = extractYouTubeIdFromBody(body);
  if (yt) {
    return `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0`;
  }
  const tiktok = extractTikTokVideoIdFromBody(body);
  if (tiktok) {
    return buildTikTokEmbedUrl(tiktok);
  }
  const social = extractSocialEmbedFromText(body);
  if (social) {
    return social;
  }
  const vm = extractVimeoIdFromBody(body);
  if (vm) {
    return `https://player.vimeo.com/video/${vm}?autoplay=1`;
  }
  const videoId = extractThreeSpeakVideoIdFromBody(body);
  if (videoId) {
    return buildThreeSpeakEmbedUrl(videoId);
  }

  const centerVideoUrl = extractVideoUrlFromCenterBlock(body);
  if (!centerVideoUrl) {
    return null;
  }

  const centerShorts = extractYouTubeShortsIdFromBody(centerVideoUrl);
  if (centerShorts) {
    return `https://www.youtube.com/shorts/${centerShorts}`;
  }
  const centerYt = extractYouTubeIdFromBody(centerVideoUrl);
  if (centerYt) {
    return `https://www.youtube.com/embed/${centerYt}?autoplay=1&rel=0`;
  }
  const centerTiktok = extractTikTokVideoIdFromBody(centerVideoUrl);
  if (centerTiktok) {
    return buildTikTokEmbedUrl(centerTiktok);
  }
  const centerSocial = extractSocialEmbedFromText(centerVideoUrl);
  if (centerSocial) {
    return centerSocial;
  }
  const centerVm = extractVimeoIdFromBody(centerVideoUrl);
  if (centerVm) {
    return `https://player.vimeo.com/video/${centerVm}?autoplay=1`;
  }
  const centerThreeSpeak = extractThreeSpeakVideoIdFromBody(centerVideoUrl);
  if (centerThreeSpeak) {
    return buildThreeSpeakEmbedUrl(centerThreeSpeak);
  }
  const centerDtube = centerVideoUrl.match(DTUBE_URL_PATTERN);
  if (centerDtube?.[1]) {
    const parts = centerDtube[1].split('/');
    const author = parts[0]?.trim();
    const permlink = parts[1]?.trim();
    if (author && permlink) {
      return `https://emb.d.tube/#!/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}`;
    }
  }

  return null;
}

/**
 * HTTPS URL suitable for an iframe `src` to play the detected video (autoplay on load).
 * Uses `json_metadata.video` (DTube / 3Speak), then YouTube thumbnail URL in metadata, then body links.
 */
export function extractVideoEmbedUrl(
  jsonMetadata: string,
  body: string,
  context: { author: string; permlink: string },
): string | null {
  const fromMeta = embedFromJsonMetadataVideo(jsonMetadata, context.author, context.permlink);
  if (fromMeta) {
    return fromMeta;
  }
  const metaThumb = videoThumbFromJsonMetadata(jsonMetadata);
  if (metaThumb) {
    const ytId = extractYouTubeIdFromThumbnailUrl(metaThumb);
    if (ytId) {
      return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
    }
  }
  return embedFromBody(body);
}
