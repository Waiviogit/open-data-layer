import 'server-only';

import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize Hive post HTML for safe rendering (server-side before `dangerouslySetInnerHTML`).
 */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
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
      iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'title'],
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
