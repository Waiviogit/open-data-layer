import { z } from 'zod';

import type { UserProfileView } from '../../domain/types/user-profile-view';

export const userProfileViewSchema: z.ZodType<UserProfileView> = z.object({
  name: z.string(),
  displayName: z.string(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  followerCount: z.number().int(),
  followingCount: z.number().int(),
  postingCount: z.number().int(),
  reputation: z.number().int(),
});

export type { UserProfileView } from '../../domain/types/user-profile-view';
