import { parseVideoUrl } from './video-preview';

export type MediaEmbedProvider = 'youtube' | 'instagram';

export type ParsedMediaEmbed = {
  provider: MediaEmbedProvider;
  embedSrc: string;
  wrapperClass: string;
  title: string;
};

const INSTAGRAM_POST =
  /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)(?:\/(?:embed(?:\/captioned)?)?)?(?:[/?#].*)?$/i;

const YOUTUBE_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

const TRAILING_PUNCTUATION = /[).,;!?]+$/;

function decodeHtmlEntities(url: string): string {
  return url.replace(/&amp;/gi, '&');
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(TRAILING_PUNCTUATION, '');
}

/** Canonical https URL for storage / markdown. */
export function canonicalizeMediaUrl(url: string): string {
  const trimmed = stripTrailingPunctuation(decodeHtmlEntities(url.trim()));
  if (trimmed === '') {
    return '';
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Detects Instagram post/reel/tv and YouTube watch/shorts/youtu.be URLs.
 * Profile URLs like instagram.com/username return null.
 */
export function parseMediaEmbedUrl(url: string): ParsedMediaEmbed | null {
  const normalized = canonicalizeMediaUrl(url);
  if (normalized === '') {
    return null;
  }

  const instagram = normalized.match(INSTAGRAM_POST);
  const kind = instagram?.[1]?.toLowerCase();
  const code = instagram?.[2];
  if (kind && code) {
    return {
      provider: 'instagram',
      embedSrc: `https://www.instagram.com/${kind}/${code}/embed`,
      wrapperClass: 'blog-post-instagram-embed',
      title: 'Instagram post',
    };
  }

  const youtube = parseVideoUrl(normalized);
  if (youtube?.provider === 'youtube') {
    return {
      provider: 'youtube',
      embedSrc: youtube.embedUrl,
      wrapperClass: 'blog-post-youtube-embed',
      title: 'YouTube video',
    };
  }

  return null;
}

/** True when `url` is already a provider embed src (do not wrap again). */
export function isProviderEmbedSrc(url: string): boolean {
  return /(?:youtube(?:-nocookie)?\.com\/embed\/|instagram\.com\/(?:p|reel|tv)\/[^/]+\/embed)/i.test(
    url,
  );
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function mediaEmbedIframeHtml(parsed: ParsedMediaEmbed): string {
  const src = escapeHtmlAttr(parsed.embedSrc);
  const title = escapeHtmlAttr(parsed.title);
  if (parsed.provider === 'youtube') {
    return `<div class="${parsed.wrapperClass}"><iframe src="${src}" title="${title}" frameborder="0" allow="${YOUTUBE_IFRAME_ALLOW}" allowfullscreen loading="lazy"></iframe></div>`;
  }
  return `<div class="${parsed.wrapperClass}"><iframe src="${src}" title="${title}" frameborder="0" scrolling="no" allowfullscreen loading="lazy"></iframe></div>`;
}
