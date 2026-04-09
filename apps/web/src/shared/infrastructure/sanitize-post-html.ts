import 'server-only';

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * If the body already contains typical Hive/HTML markup, skip markdown and only sanitize.
 * Block-level tags, links, and images indicate authored HTML rather than plain text/markdown.
 */
const LOOKS_LIKE_HTML =
  /<\s*\/?(p|div|br|h[1-6]|ul|ol|li|blockquote|iframe|section|article|center|table|pre|hr|a|img)\b/i;

function postBodyToIntermediateHtml(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return '';
  }
  if (LOOKS_LIKE_HTML.test(raw)) {
    return raw;
  }
  return marked.parse(raw, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;
}

/**
 * Convert remaining Markdown image syntax `![alt](url)` → `<img src="url" alt="alt">`.
 * This runs after `postBodyToIntermediateHtml` so it fixes mixed HTML+Markdown bodies where
 * `marked` was skipped (HTML detected) but image tokens are still in raw Markdown form.
 */
function convertMarkdownImages(html: string): string {
  if (!html.includes('![')) {
    return html;
  }
  return html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s"'<>]+)\)/g,
    (_, alt: string, src: string) => `<img src="${src}" alt="${alt}">`,
  );
}

const YOUTUBE_ID = '[a-zA-Z0-9_-]{11}';

/** Replace bare YouTube watch / youtu.be URLs with embed iframes (after markdown → HTML). */
function embedYouTubeUrls(html: string): string {
  if (!html.includes('youtube') && !html.includes('youtu.be')) {
    return html;
  }

  let out = html;

  // Full <a href="...youtube watch...">...</a>
  out = out.replace(
    new RegExp(
      `<a\\s+[^>]*href=["'](https?:\\/\\/(?:www\\.)?youtube\\.com\\/watch\\?[^"']*v=(${YOUTUBE_ID})[^"']*)["'][^>]*>[\\s\\S]*?<\\/a>`,
      'gi',
    ),
    (_m, _href: string, id: string) => youtubeIframeHtml(id),
  );
  // <a href="https://youtu.be/ID...">...</a>
  out = out.replace(
    new RegExp(
      `<a\\s+[^>]*href=["'](https?:\\/\\/youtu\\.be\\/(${YOUTUBE_ID})[^"']*)["'][^>]*>[\\s\\S]*?<\\/a>`,
      'gi',
    ),
    (_m, _href: string, id: string) => youtubeIframeHtml(id),
  );

  // Remaining bare URLs (plain text or leftover)
  const watchUrl = /https?:\/\/(?:www\.)?youtube\.com\/watch\?[^\s<"&]+/gi;
  const shortUrl = /https?:\/\/youtu\.be\/[^\s<"&]+/gi;

  out = out.replace(watchUrl, (url) => {
    if (url.includes('/embed/')) {
      return url;
    }
    const id = extractYoutubeVideoId(url);
    return id ? youtubeIframeHtml(id) : url;
  });
  out = out.replace(shortUrl, (url) => {
    if (url.includes('/embed/')) {
      return url;
    }
    const id = extractYoutubeVideoId(url);
    return id ? youtubeIframeHtml(id) : url;
  });

  return out;
}

function extractYoutubeVideoId(url: string): string | null {
  const fromWatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (fromWatch) {
    return fromWatch[1] ?? null;
  }
  const fromShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (fromShort) {
    return fromShort[1] ?? null;
  }
  return null;
}

function youtubeIframeHtml(videoId: string): string {
  const src = `https://www.youtube.com/embed/${videoId}`;
  return `<div class="blog-post-youtube-embed"><iframe src="${src}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
}

/**
 * Sanitize Hive post HTML for safe rendering (server-side before `dangerouslySetInnerHTML`).
 * Plain text / markdown is converted with `marked` first; existing HTML is sanitized only.
 */
export function sanitizePostHtml(html: string): string {
  const intermediate = embedYouTubeUrls(
    convertMarkdownImages(postBodyToIntermediateHtml(html)),
  );
  return sanitizeHtml(intermediate, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      // `img` was removed from sanitize-html defaults in v2.x; add it back explicitly.
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
      img: ['src', 'alt', 'title', 'width', 'height', 'class', 'srcset', 'sizes'],
      a: ['href', 'name', 'target', 'rel', 'class', 'title'],
      iframe: [
        'src',
        'width',
        'height',
        'allowfullscreen',
        'frameborder',
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
      'www.dailymotion.com',
      'embed.twitch.tv',
    ],
  });
}
