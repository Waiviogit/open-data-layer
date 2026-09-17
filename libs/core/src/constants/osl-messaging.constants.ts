export const CHANNEL_KINDS = ['direct', 'group', 'object'] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const CHANNEL_ACCESS = ['members_only', 'public_read'] as const;
export type ChannelAccess = (typeof CHANNEL_ACCESS)[number];

export const CHANNEL_MEMBER_ROLES = ['admin', 'member'] as const;
export type ChannelMemberRole = (typeof CHANNEL_MEMBER_ROLES)[number];

/** Maximum members in an active group channel (including creator/admin). */
export const MAX_GROUP_CHANNEL_MEMBERS = 100;

/** Max invitees in `channel_create.members` (creator added separately). */
export const MAX_GROUP_CHANNEL_CREATE_INVITEES = MAX_GROUP_CHANNEL_MEMBERS - 1;

/** Activity dedup fingerprint algorithm version (on-chain `source.fp_v`). */
export const ACTIVITY_FINGERPRINT_VERSION = 1;

/** Near-duplicate window on source publish time (seconds). */
export const ACTIVITY_DEDUP_WINDOW_SEC = 72 * 3600;

export const ACTIVITY_SIMHASH_MAX_HAMMING = 3;
export const ACTIVITY_PHASH_MAX_HAMMING = 8;
export const ACTIVITY_SIMHASH_MIN_TEXT_LENGTH = 40;
export const ACTIVITY_MAX_IMAGE_PHASHES = 12;

export const ACTIVITY_SOURCE_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'x',
  'youtube',
  'threads',
  'other',
] as const;
export type ActivitySourcePlatform = (typeof ACTIVITY_SOURCE_PLATFORMS)[number];
