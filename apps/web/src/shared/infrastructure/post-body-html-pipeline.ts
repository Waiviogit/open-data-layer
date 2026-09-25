import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

import { getProxyImageUrl } from './image/get-proxy-image-url';
import {
  isProviderEmbedSrc,
  mediaEmbedIframeHtml,
  parseMediaEmbedUrl,
} from './media-embed';
import { linkifyBareImageUrls, linkifyHiveMentions } from './social-content-html';

/**
 * If the body already contains typical Hive/HTML markup, skip markdown and only sanitize.
 */
export const POST_BODY_LOOKS_LIKE_HTML =
  /<\s*\/?(p|div|br|h[1-6]|ul|ol|li|blockquote|iframe|section|article|center|table|pre|hr|a|img)\b/i;

/** Peakd and similar apps append HTML footers to markdown posts. */
const TRAILING_HTML_FOOTER =
  /(?:\s*<br\s*\/?>\s*)+(?:\s*<sub>[\s\S]*?<\/sub>\s*)+$/i;

/** Opening content that should stay on the markdown path even with HTML footers. */
const MARKDOWN_LEAD =
  /^(?:\[!\[|#+\s|>\s|(?:-\s|\d+\.\s|\*\s|\|\s))/m;

const THREE_SPEAK_VIDEO_ID = '[^&\\s<>"\')]+';

function stripTrailingHtmlFooter(raw: string): string {
  return raw.replace(TRAILING_HTML_FOOTER, '').trim();
}

export function postBodyLooksLikeHtml(raw: string): boolean {
  const main = stripTrailingHtmlFooter(raw.trim());
  if (main === '') {
    return false;
  }
  if (MARKDOWN_LEAD.test(main.slice(0, 800))) {
    return false;
  }
  return POST_BODY_LOOKS_LIKE_HTML.test(main);
}

/** Peakd 3Speak posts prefix the body with a linked poster + watch link in markdown. */
function preprocessPeakdThreeSpeakMarkdown(raw: string): {
  text: string;
  embedPrefix: string;
} {
  let result = raw;
  let embedPrefix = '';

  result = result.replace(
    new RegExp(
      `\\[!\\[[^\\]]*\\]\\([^)]*\\)\\]\\(\\s*https?:\\/\\/3speak\\.(?:tv|online)\\/(?:watch|embed)\\?[^)]+\\)`,
      'gi',
    ),
    (match) => {
      const videoIdMatch = match.match(
        new RegExp(`v=(${THREE_SPEAK_VIDEO_ID})`, 'i'),
      );
      if (videoIdMatch) {
        embedPrefix = threeSpeakIframeHtml(videoIdMatch[1]);
      }
      return '';
    },
  );

  result = result.replace(
    /(?:▶️|▶\uFE0F?)\s*\[Watch on 3Speak\]\(\s*https?:\/\/3speak\.(?:tv|online)\/[^)]+\)\s*/gi,
    '',
  );
  if (embedPrefix !== '') {
    result = result.replace(/^\s*---+\s*\n/, '');
  }

  return { text: result.trim(), embedPrefix };
}

export function postBodyToIntermediateHtml(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return '';
  }
  const { text: prepared, embedPrefix } = preprocessPeakdThreeSpeakMarkdown(trimmed);
  if (postBodyLooksLikeHtml(trimmed)) {
    return embedPrefix + prepared;
  }
  return embedPrefix + (marked.parse(prepared, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string);
}

export function convertMarkdownImages(html: string): string {
  if (!html.includes('![')) {
    return html;
  }
  return html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s"'<>]+)\)/g,
    (_, alt: string, src: string) => `<img src="${src}" alt="${alt}">`,
  );
}

function threeSpeakIframeHtml(videoIdRaw: string): string {
  let videoId = videoIdRaw;
  try {
    videoId = decodeURIComponent(videoIdRaw.replace(/\+/g, ' '));
  } catch {
    videoId = videoIdRaw;
  }
  if (videoId.includes('..')) {
    return '';
  }
  const src = `https://play.3speak.tv/watch?v=${encodeURIComponent(videoId)}&mode=iframe&layout=desktop`;
  return `<div class="blog-post-3speak-embed"><iframe src="${src}" title="3Speak video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
}

/** Legacy Waivio `Body.js` — linked poster images become iframe; drop duplicate posters when embedded. */
export function embedThreeSpeakInBody(html: string): string {
  if (!html.includes('3speak')) {
    return html;
  }

  let out = html;

  out = out.replace(
    new RegExp(
      `<a\\s+[^>]*(?:href|data-href)=["']https?:\\/\\/3speak\\.(?:tv|online)\\/(?:watch|embed)\\?[^"']*\\bv=(${THREE_SPEAK_VIDEO_ID})[^"']*["'][^>]*>\\s*<img[^>]*>\\s*<\\/a>`,
      'gi',
    ),
    (_match, videoId: string) => threeSpeakIframeHtml(videoId),
  );

  out = out.replace(
    new RegExp(
      `<img[^>]*data-linked-url=["']https?:\\/\\/3speak\\.(?:tv|online)\\/[^"']*\\bv=(${THREE_SPEAK_VIDEO_ID})[^"']*["'][^>]*>`,
      'gi',
    ),
    (_match, videoId: string) => threeSpeakIframeHtml(videoId),
  );

  if (!/play\.3speak\.tv/i.test(out)) {
    out = out.replace(
      new RegExp(
        `https?:\\/\\/3speak\\.(?:tv|online)\\/(?:watch|embed)\\?(?:[^"'\\s]*&)*v=(${THREE_SPEAK_VIDEO_ID})`,
        'gi',
      ),
      (_match, videoId: string) => threeSpeakIframeHtml(videoId),
    );
  }

  if (/play\.3speak\.tv/i.test(out)) {
    out = out.replace(
      /<a\s+[^>]*href=["']https?:\/\/3speak\.(?:tv|online)\/[^"']+["'][^>]*>\s*<img[^>]*>\s*<\/a>/gi,
      '',
    );
    out = out.replace(
      /<img[^>]*data-linked-url=["']https?:\/\/3speak\.[^"']+["'][^>]*>/gi,
      '',
    );
  }

  return out;
}

/**
 * Replace Instagram / YouTube `<a href>` and leftover bare URLs with iframes.
 * Skip already-embed srcs so existing iframe `src` values are not nested.
 */
export function embedMediaUrls(html: string): string {
  const lower = html.toLowerCase();
  if (
    !lower.includes('youtube') &&
    !lower.includes('youtu.be') &&
    !lower.includes('instagram.com')
  ) {
    return html;
  }

  let out = html;

  out = out.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi,
    (match, href: string) => {
      const parsed = parseMediaEmbedUrl(href);
      return parsed ? mediaEmbedIframeHtml(parsed) : match;
    },
  );

  out = out.replace(/https?:\/\/[^\s<"']+/gi, (url) => {
    if (isProviderEmbedSrc(url)) {
      return url;
    }
    const parsed = parseMediaEmbedUrl(url);
    return parsed ? mediaEmbedIframeHtml(parsed) : url;
  });

  return out;
}

const POST_BODY_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'center',
    'del',
    'ins',
    'picture',
    'source',
    'iframe',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: [
      'src',
      'alt',
      'title',
      'width',
      'height',
      'class',
      'srcset',
      'sizes',
      'data-fallback-src',
    ],
    a: ['href', 'name', 'target', 'rel', 'class', 'title'],
    iframe: [
      'src',
      'width',
      'height',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'title',
      'allow',
      'loading',
      'class',
    ],
    div: ['class'],
    '*': ['class', 'id'],
  },
  allowedIframeHostnames: [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    '3speak.tv',
    'play.3speak.tv',
    'www.dailymotion.com',
    'embed.twitch.tv',
    'www.instagram.com',
    'instagram.com',
  ],
  transformTags: {
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

/** Markdown or HTML post body → safe HTML for display. Client and server safe. */
export function sanitizePostBodyHtml(raw: string): string {
  const parsed = postBodyToIntermediateHtml(raw);
  const withImages = linkifyBareImageUrls(parsed);
  const intermediate = linkifyHiveMentions(
    embedMediaUrls(embedThreeSpeakInBody(convertMarkdownImages(withImages))),
  );
  return sanitizeHtml(intermediate, POST_BODY_SANITIZE_OPTIONS);
}
