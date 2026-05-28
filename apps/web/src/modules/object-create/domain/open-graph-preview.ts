/** Facebook / Open Graph typical title display limit. */
export const OG_PREVIEW_TITLE_MAX_CHARS = 60;

/** Typical OG description length before platforms truncate. */
export const OG_PREVIEW_DESCRIPTION_MAX_CHARS = 200;

/** Standard OG image dimensions (1200×630). */
export const OG_PREVIEW_IMAGE_ASPECT_RATIO = 1200 / 630;

export function previewSiteHostname(): string {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'opden.io';
}

export function truncateOgTitle(title: string): {
  text: string;
  truncated: boolean;
} {
  const trimmed = title.trim();
  if (trimmed.length <= OG_PREVIEW_TITLE_MAX_CHARS) {
    return { text: trimmed, truncated: false };
  }
  return {
    text: `${trimmed.slice(0, OG_PREVIEW_TITLE_MAX_CHARS - 1)}…`,
    truncated: true,
  };
}

export function truncateOgDescription(description: string): {
  text: string;
  truncated: boolean;
} {
  const trimmed = description.trim();
  if (trimmed.length <= OG_PREVIEW_DESCRIPTION_MAX_CHARS) {
    return { text: trimmed, truncated: false };
  }
  return {
    text: `${trimmed.slice(0, OG_PREVIEW_DESCRIPTION_MAX_CHARS - 1)}…`,
    truncated: true,
  };
}
