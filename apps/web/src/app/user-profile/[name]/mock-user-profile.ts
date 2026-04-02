import type { UserProfileShellUser } from '@/modules/user-profile';

/**
 * Route-layer mock factory. Presentational components must not import this file.
 */
export function getMockUserProfile(accountName: string): UserProfileShellUser {
  const name = accountName.trim();
  return {
    id: `mock-${name}`,
    name,
    displayName: name === name.toLowerCase() ? name : `${name}`,
    bio: 'Mock profile bio — replace with API data.',
    followerCount: 128,
    followingCount: 42,
    postingCount: 256,
    coverImageUrl: null,
    avatarUrl: null,
  };
}
