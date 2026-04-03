import { FEED_EXCERPT_MAX_LENGTH } from './feed.constants';

/**
 * Strips HTML-like tags and collapses whitespace for a feed excerpt.
 */
export function stripHtmlForExcerpt(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateExcerpt(text: string, maxLen = FEED_EXCERPT_MAX_LENGTH): string {
  if (text.length <= maxLen) {
    return text;
  }
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.6) {
    return `${slice.slice(0, lastSpace)}…`;
  }
  return `${slice}…`;
}
