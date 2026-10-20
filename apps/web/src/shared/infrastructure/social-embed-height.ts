/** Likes count + “Add a comment” rows in the official `/embed` chrome (cannot be hidden via URL). */
export const INSTAGRAM_EMBED_LIKES_COMMENT_CHROME_PX = 140;

const HEIGHT_KEYS = ['height', 'clientHeight', 'scrollHeight', 'iframeHeight'] as const;

const NESTED_KEYS = ['details', 'payload', 'params', 'data', 'value'] as const;

const SOCIAL_EMBED_HOSTS = new Set([
  'instagram.com',
  'facebook.com',
  'platform.twitter.com',
  'twitter.com',
  'linkedin.com',
]);

export function isSocialEmbedResizeOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.replace(/^www\./i, '').toLowerCase();
    return SOCIAL_EMBED_HOSTS.has(host);
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toEmbedHeight(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? clampEmbedHeight(raw) : null;
  }
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? clampEmbedHeight(parsed) : null;
  }
  return null;
}

function clampEmbedHeight(value: number): number | null {
  const rounded = Math.round(value);
  if (rounded < 80 || rounded > 4000) {
    return null;
  }
  return rounded;
}

function findHeight(value: unknown, depth: number): number | null {
  if (depth > 4) {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findHeight(item, depth + 1);
      if (found != null) {
        return found;
      }
    }
    return null;
  }
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  for (const key of HEIGHT_KEYS) {
    const height = toEmbedHeight(rec[key]);
    if (height != null) {
      return height;
    }
  }
  for (const nested of NESTED_KEYS) {
    if (nested in rec) {
      const found = findHeight(rec[nested], depth + 1);
      if (found != null) {
        return found;
      }
    }
  }
  return null;
}

/** Height in px from Instagram / Facebook / X / LinkedIn iframe `postMessage` payloads. */
export function parseSocialEmbedHeight(data: unknown): number | null {
  if (typeof data === 'number') {
    return toEmbedHeight(data);
  }
  let payload: unknown = data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed === '') {
      return null;
    }
    try {
      payload = JSON.parse(trimmed) as unknown;
    } catch {
      const m = trimmed.match(/height["'\s:=]+(\d{2,5})/i);
      return toEmbedHeight(m?.[1]);
    }
  }
  return findHeight(payload, 0);
}

export function socialEmbedFrameHeights(
  iframeSrc: string,
  measuredHeight: number,
): { iframeHeight: number; visibleHeight: number } {
  if (!/instagram\.com/i.test(iframeSrc)) {
    return { iframeHeight: measuredHeight, visibleHeight: measuredHeight };
  }
  return {
    iframeHeight: measuredHeight,
    visibleHeight: Math.max(
      measuredHeight - INSTAGRAM_EMBED_LIKES_COMMENT_CHROME_PX,
      80,
    ),
  };
}

export function applySocialEmbedFrameHeight(
  iframe: HTMLIFrameElement,
  height: number,
): void {
  const { iframeHeight, visibleHeight } = socialEmbedFrameHeights(
    iframe.src,
    height,
  );
  iframe.style.height = `${iframeHeight}px`;
  iframe.style.minHeight = `${iframeHeight}px`;
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('scrolling', 'no');
  const wrap = iframe.parentElement;
  if (!wrap) {
    return;
  }
  wrap.style.height = `${visibleHeight}px`;
  wrap.style.minHeight = `${visibleHeight}px`;
  wrap.style.aspectRatio = 'auto';
  wrap.style.overflow = 'hidden';
}
