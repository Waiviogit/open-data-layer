import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

import { getProxyImageUrl } from './image/get-proxy-image-url';
import {
  linkifyBareImageUrls,
  linkifyHiveMentions,
} from './social-content-html';

/**
 * Detect minimal HTML so we skip markdown (Hive bodies may be HTML already).
 */
const LOOKS_LIKE_HTML =
  /<\s*\/?(p|div|br|h[1-6]|ul|ol|li|a|strong|em|blockquote|img)\b/i;

const FEED_CONTENT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['a', 'p', 'br', 'strong', 'em', 'code', 'span', 'ul', 'ol', 'li', 'img'],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'class', 'data-fallback-src'],
  },
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? '';
      const isProfileLink = href.startsWith('/@');
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(isProfileLink
            ? {}
            : { target: '_blank', rel: 'noopener noreferrer' }),
        },
      };
    },
    img: (tagName, attribs) => {
      const originalSrc = attribs.src?.trim() ?? '';
      if (!originalSrc) {
        return { tagName, attribs };
      }
      const proxied = getProxyImageUrl(originalSrc);
      return {
        tagName,
        attribs: {
          ...attribs,
          src: proxied,
          ...(proxied !== originalSrc
            ? { 'data-fallback-src': originalSrc }
            : {}),
        },
      };
    },
  },
};

function normalizeFeedImageUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}`;
  } catch {
    return url.trim().replace(/\/$/, '');
  }
}

function feedImageUrlsMatch(a: string, b: string): boolean {
  return normalizeFeedImageUrl(a) === normalizeFeedImageUrl(b);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove markdown/bare preview image from excerpt text before HTML conversion. */
function stripPreviewImageFromRawExcerpt(raw: string, omitImageUrl: string): string {
  const escaped = escapeRegExp(omitImageUrl.trim());
  let result = raw;
  result = result.replace(
    new RegExp(`!\\[[^\\]]*\\]\\(\\s*${escaped}\\s*\\)`, 'gi'),
    ' ',
  );
  result = result.replace(new RegExp(escaped, 'gi'), ' ');
  return result.replace(/\s+/g, ' ').trim();
}

function stripPreviewImageFromExcerptHtml(html: string, omitImageUrl: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const match = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (match && feedImageUrlsMatch(match[1], omitImageUrl)) {
      return '';
    }
    return tag;
  });
}

export type FeedExcerptToSafeHtmlOptions = {
  /** When set, omit this image from the excerpt (feed card preview already shows it). */
  omitImageUrl?: string | null;
  /** Additional image URLs to strip from the excerpt (e.g. 3Speak poster + metadata thumb). */
  omitImageUrls?: Array<string | null | undefined>;
  /** Remove 3Speak watch/embed links from excerpt text when the card already shows the player. */
  stripThreeSpeakLinks?: boolean;
};

function collectOmitImageUrls(options?: FeedExcerptToSafeHtmlOptions): string[] {
  const urls = new Set<string>();
  const single = options?.omitImageUrl?.trim();
  if (single) {
    urls.add(single);
  }
  for (const url of options?.omitImageUrls ?? []) {
    const trimmed = url?.trim();
    if (trimmed) {
      urls.add(trimmed);
    }
  }
  return [...urls];
}

const THREE_SPEAK_WATCH_URL =
  /https?:\/\/3speak\.(?:tv|online)\/(?:watch|embed)\?[^)\s]+/gi;

/** Peakd-style 3Speak posts prefix the body with a linked poster + "Watch on 3Speak" link. */
function stripThreeSpeakLinksFromExcerpt(raw: string): string {
  let result = raw;

  // Linked-image preview: [![](poster)](https://3speak.tv/watch?v=…)
  result = result.replace(
    /\[!\[[^\]]*\]\([^)]*\)\]\(\s*https?:\/\/3speak\.(?:tv|online)\/(?:watch|embed)\?[^)]+\)/gi,
    ' ',
  );

  // "▶️ [Watch on 3Speak](url)" → plain label (legacy BodyShort shows this text after render)
  result = result.replace(
    /(?:▶️|▶\uFE0F?)\s*\[Watch on 3Speak\]\(\s*https?:\/\/3speak\.(?:tv|online)\/[^)]+\)/gi,
    '▶ Watch on 3Speak',
  );
  result = result.replace(
    /\[Watch on 3Speak\]\(\s*https?:\/\/3speak\.(?:tv|online)\/[^)]+\)/gi,
    '▶ Watch on 3Speak',
  );

  result = result.replace(THREE_SPEAK_WATCH_URL, ' ');

  // Horizontal rule between preview block and post body
  result = result.replace(/^\s*---+\s*/g, '');
  result = result.replace(/\s+---+\s+/g, ' ');

  // Broken markdown left when only URLs were stripped previously
  result = result.replace(/\[\s*\]\(\s*\)/g, ' ');
  result = result.replace(/\[\s*\]\(\s+/g, ' ');

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Turn feed excerpt text (often Markdown) into safe HTML for `dangerouslySetInnerHTML`.
 * Client-safe — use in `Story` and other client components (unlike `sanitize-post-html`).
 */
export function feedExcerptToSafeHtml(
  raw: string,
  options?: FeedExcerptToSafeHtmlOptions,
): string {
  const omitImageUrls = collectOmitImageUrls(options);
  let source = raw.trim();
  if (source === '') {
    return '';
  }
  if (options?.stripThreeSpeakLinks) {
    source = stripThreeSpeakLinksFromExcerpt(source);
    if (source === '') {
      return '';
    }
  }
  const looksLikeHtml = LOOKS_LIKE_HTML.test(source);
  if (omitImageUrls.length > 0 && !looksLikeHtml) {
    for (const omitImageUrl of omitImageUrls) {
      source = stripPreviewImageFromRawExcerpt(source, omitImageUrl);
    }
    if (source === '') {
      return '';
    }
  }
  const prepared = linkifyBareImageUrls(source);
  const intermediate = looksLikeHtml
    ? prepared
    : (marked.parse(prepared, { async: false, gfm: true, breaks: true }) as string);
  const withMentions = linkifyHiveMentions(intermediate);
  let safe = sanitizeHtml(withMentions, FEED_CONTENT_SANITIZE_OPTIONS);
  for (const omitImageUrl of omitImageUrls) {
    safe = stripPreviewImageFromExcerptHtml(safe, omitImageUrl);
  }
  return safe;
}
