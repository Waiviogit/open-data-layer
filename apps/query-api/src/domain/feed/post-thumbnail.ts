/**
 * First image URL for feed preview: Hive `json_metadata.image`, then markdown/HTML in body.
 */
export function extractThumbnailUrl(jsonMetadata: string, body: string): string | null {
  const fromMeta = firstImageFromJsonMetadata(jsonMetadata);
  if (fromMeta) {
    return fromMeta;
  }
  return firstImageFromBody(body);
}

function tryParseJson(s: string): unknown | null {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function firstImageFromJsonMetadata(jsonMetadata: string): string | null {
  const parsed = tryParseJson(jsonMetadata);
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const image = (parsed as Record<string, unknown>).image;
  if (!Array.isArray(image) || image.length === 0) {
    return null;
  }
  const first = image[0];
  if (typeof first !== 'string' || first.trim() === '') {
    return null;
  }
  return normalizeUrl(first.trim());
}

const MARKDOWN_IMG = /!\[[^\]]*]\(\s*([^)\s]+)\s*\)/;
const HTML_IMG = /<img[^>]+src=["']([^"']+)["']/i;

function firstImageFromBody(body: string): string | null {
  const md = body.match(MARKDOWN_IMG);
  if (md?.[1]) {
    return normalizeUrl(md[1].trim());
  }
  const html = body.match(HTML_IMG);
  if (html?.[1]) {
    return normalizeUrl(html[1].trim());
  }
  return null;
}

function normalizeUrl(url: string): string | null {
  if (url === '' || url.startsWith('data:')) {
    return null;
  }
  return url;
}
