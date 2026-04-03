const HIVE_AVATAR_BASE = 'https://images.hive.blog/u';

export type ResolveAvatarUrlInput = {
  /** Hive account name; used for default CDN URL when `avatarUrl` is empty. */
  username: string;
  /** Explicit image URL from API / feed row; takes precedence when non-empty after trim. */
  avatarUrl?: string | null;
  /** Pixel size; `> 64` selects Hive `large` avatar path, else `small`. */
  size: number;
};

/**
 * Resolves the image URL for a user avatar: explicit URL first, else Hive default by username and size.
 * Returns `null` when there is no usable URL (e.g. empty username with no avatar).
 */
export function resolveAvatarUrl(input: ResolveAvatarUrlInput): string | null {
  const trimmed = input.avatarUrl?.trim();
  if (trimmed) {
    return trimmed;
  }
  const name = input.username.trim();
  if (!name) {
    return null;
  }
  const variant = input.size > 64 ? 'large' : 'small';
  return `${HIVE_AVATAR_BASE}/${name}/avatar/${variant}`;
}
