import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Detect minimal HTML so we skip markdown (Hive bodies may be HTML already).
 */
const LOOKS_LIKE_HTML =
  /<\s*\/?(p|div|br|h[1-6]|ul|ol|li|a|strong|em|blockquote)\b/i;

/**
 * Turn feed excerpt text (often Markdown) into safe HTML for `dangerouslySetInnerHTML`.
 * Client-safe — use in `Story` and other client components (unlike `sanitize-post-html`).
 */
export function feedExcerptToSafeHtml(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return '';
  }
  const intermediate = LOOKS_LIKE_HTML.test(raw)
    ? raw
    : (marked.parse(raw, { async: false, gfm: true, breaks: true }) as string);
  return sanitizeHtml(intermediate, {
    allowedTags: ['a', 'p', 'br', 'strong', 'em', 'code', 'span', 'ul', 'ol', 'li'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });
}
