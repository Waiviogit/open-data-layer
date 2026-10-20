import { parseVideoUrl, stripUrlTruncation } from './video-preview';

export type MediaEmbedProvider =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'x'
  | 'linkedin';

export type ParsedMediaEmbed = {
  provider: MediaEmbedProvider;
  embedSrc: string;
  wrapperClass: string;
  title: string;
};

const YOUTUBE_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

const TIKTOK_IFRAME_ALLOW =
  'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';

const FACEBOOK_IFRAME_ALLOW =
  'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';

const TRAILING_PUNCTUATION = /[).,;!?]+$/;

function decodeHtmlEntities(url: string): string {
  return url.replace(/&amp;/gi, '&');
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(TRAILING_PUNCTUATION, '');
}

/** Canonical https URL for storage / markdown. */
export function canonicalizeMediaUrl(url: string): string {
  const trimmed = stripTrailingPunctuation(
    stripUrlTruncation(decodeHtmlEntities(url.trim())),
  );
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
 * Detects Instagram / YouTube / TikTok / Facebook / X / LinkedIn video URLs.
 * Profile URLs like instagram.com/username return null.
 */
export function parseMediaEmbedUrl(url: string): ParsedMediaEmbed | null {
  const normalized = canonicalizeMediaUrl(url);
  if (normalized === '') {
    return null;
  }

  const parsed = parseVideoUrl(normalized);
  if (!parsed) {
    return null;
  }

  if (parsed.provider === 'instagram') {
    return {
      provider: 'instagram',
      embedSrc: parsed.embedUrl,
      wrapperClass: 'blog-post-instagram-embed',
      title: 'Instagram post',
    };
  }
  if (parsed.provider === 'youtube') {
    return {
      provider: 'youtube',
      embedSrc: parsed.embedUrl,
      wrapperClass:
        parsed.layout === 'portrait'
          ? 'blog-post-youtube-embed blog-post-youtube-embed--portrait'
          : 'blog-post-youtube-embed',
      title: 'YouTube video',
    };
  }
  if (parsed.provider === 'tiktok') {
    return {
      provider: 'tiktok',
      embedSrc: parsed.embedUrl,
      wrapperClass: 'blog-post-tiktok-embed',
      title: 'TikTok video',
    };
  }
  if (parsed.provider === 'facebook') {
    return {
      provider: 'facebook',
      embedSrc: parsed.embedUrl,
      wrapperClass:
        parsed.layout === 'portrait'
          ? 'blog-post-facebook-embed blog-post-facebook-embed--portrait'
          : 'blog-post-facebook-embed',
      title: 'Facebook video',
    };
  }
  if (parsed.provider === 'x') {
    return {
      provider: 'x',
      embedSrc: parsed.embedUrl,
      wrapperClass: 'blog-post-x-embed',
      title: 'X post',
    };
  }
  if (parsed.provider === 'linkedin') {
    return {
      provider: 'linkedin',
      embedSrc: parsed.embedUrl,
      wrapperClass: 'blog-post-linkedin-embed',
      title: 'LinkedIn post',
    };
  }

  return null;
}

/** True when `url` is already a provider embed src (do not wrap again). */
export function isProviderEmbedSrc(url: string): boolean {
  return /(?:youtube(?:-nocookie)?\.com\/embed\/|instagram\.com\/(?:p|reel|tv)\/[^/]+\/embed|tiktok\.com\/(?:player\/v1|embed\/v2)\/|facebook\.com\/plugins\/video\.php|platform\.twitter\.com\/embed\/Tweet\.html|linkedin\.com\/embed\/feed\/update\/)/i.test(
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
  if (parsed.provider === 'tiktok') {
    return `<div class="${parsed.wrapperClass}"><iframe src="${src}" title="${title}" frameborder="0" allow="${TIKTOK_IFRAME_ALLOW}" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if (parsed.provider === 'facebook') {
    return `<div class="${parsed.wrapperClass}"><iframe src="${src}" title="${title}" frameborder="0" allow="${FACEBOOK_IFRAME_ALLOW}" allowfullscreen loading="lazy" scrolling="no"></iframe></div>`;
  }
  return `<div class="${parsed.wrapperClass}"><iframe src="${src}" title="${title}" frameborder="0" scrolling="no" allowfullscreen loading="lazy"></iframe></div>`;
}
