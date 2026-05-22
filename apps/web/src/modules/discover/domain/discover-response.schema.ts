import { z } from 'zod';

import { socialProjectedObjectSchema } from '@/modules/user-social/application/dto/user-social.dto';

export const discoverObjectsPageSchema = z.object({
  items: z.array(socialProjectedObjectSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type DiscoverObjectsPage = z.infer<typeof discoverObjectsPageSchema>;

export const discoverUserRowSchema = z.object({
  name: z.string(),
  profile_image: z.string().nullable(),
  reputation: z.number(),
  followers_count: z.number(),
  is_following: z.boolean(),
});

export const discoverUsersPageSchema = z.object({
  items: z.array(discoverUserRowSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type DiscoverUsersPage = z.infer<typeof discoverUsersPageSchema>;

export const discoverTagCategoryItemSchema = z.object({
  value: z.string(),
  count: z.number(),
});

export const discoverTagCategoriesResponseSchema = z.object({
  categories: z.array(
    z.object({
      category: z.string(),
      items: z.array(discoverTagCategoryItemSchema),
    }),
  ),
});

export type DiscoverTagCategoriesResponse = z.infer<typeof discoverTagCategoriesResponseSchema>;
