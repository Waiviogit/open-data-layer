import type { ProjectedGalleryPhotoView } from './object-page.types';

export type DescriptionPageBlock =
  | { kind: 'paragraph'; html: string }
  | { kind: 'photo'; url: string };

export const DESCRIPTION_PAGE_MAX_PHOTOS = 15;

/** Strip HTML comments and normalize line breaks (legacy `cleanHtmlCommentsAndLines` subset). */
export function normalizeDescriptionText(raw: string): string {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Split description into paragraph blocks.
 * Primary: blank-line breaks (legacy textarea). Fallback: HTML `<p>` chunks.
 */
export function splitDescriptionParagraphs(raw: string): string[] {
  const cleaned = normalizeDescriptionText(raw);
  if (!cleaned) {
    return [];
  }

  const byBlankLines = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (byBlankLines.length > 1) {
    return byBlankLines;
  }

  if (/<p[\s>]/i.test(cleaned)) {
    const chunks = cleaned
      .split(/<\/p>\s*/i)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0)
      .map((chunk) => (chunk.endsWith('</p>') ? chunk : `${chunk}</p>`));
    if (chunks.length > 0) {
      return chunks;
    }
  }

  return [cleaned];
}

/**
 * Legacy DescriptionPage checkerboard: photo[i] after paragraph[i]; leftovers at bottom.
 * @see tmp/waivio-frontend-legacy/src/client/object/Description/DescriptionPage.js
 */
export function buildDescriptionPageBlocks(
  paragraphs: string[],
  photos: ProjectedGalleryPhotoView[],
  maxPhotos = DESCRIPTION_PAGE_MAX_PHOTOS,
): DescriptionPageBlock[] {
  const capped = photos.slice(0, maxPhotos);
  const blocks: DescriptionPageBlock[] = [];

  for (let i = 0; i < paragraphs.length; i += 1) {
    blocks.push({ kind: 'paragraph', html: paragraphs[i]! });
    const photo = capped[i];
    if (photo) {
      blocks.push({ kind: 'photo', url: photo.url });
    }
  }

  for (let i = paragraphs.length; i < capped.length; i += 1) {
    blocks.push({ kind: 'photo', url: capped[i]!.url });
  }

  return blocks;
}
