/**
 * First segment after the account in `/@account/...` or `/user-profile/account/...` that
 * belongs to the profile shell (not a Hive post). Keep aligned with `(profile)` routes and
 * `src/proxy.ts`.
 */
export const USER_PROFILE_RESERVED_FIRST_SEGMENTS: readonly string[] = [
  'threads',
  'comments',
  'mentions',
  'activity',
  'map',
  'user-shop',
  'recipe',
  'favorites',
  'transfers',
  'followers',
  'following',
  'following-objects',
  'reblogs',
  'expertise-hashtags',
  'expertise-objects',
  'about',
] as const;

const USER_PROFILE_RESERVED_FIRST_SEGMENT_SET = new Set(USER_PROFILE_RESERVED_FIRST_SEGMENTS);

export function isUserProfileReservedFirstSegment(segment: string): boolean {
  return USER_PROFILE_RESERVED_FIRST_SEGMENT_SET.has(segment);
}

/**
 * Parses path segments after the account name for both public (`/@name/...`)
 * and internal (`/user-profile/name/...`) URLs.
 */
export function getSegmentsAfterAccount(pathname: string): string[] {
  let parts: string[];
  if (pathname.startsWith('/@')) {
    parts = pathname.slice(2).split('/').filter(Boolean);
  } else if (pathname.startsWith('/user-profile/')) {
    parts = pathname.slice('/user-profile/'.length).split('/').filter(Boolean);
  } else {
    return [];
  }
  return parts.slice(1);
}
