import { z } from 'zod';

const MAX_PAGE = 50;
const DEFAULT_PAGE = 20;

export const userSubscriptionSortSchema = z
  .enum(['rank', 'followers', 'a-z', 'recency'])
  .optional()
  .default('recency');

/** Query for GET followers / GET following lists. */
export const userSocialListQuerySchema = z.object({
  sort: userSubscriptionSortSchema,
  skip: z.coerce.number().int().min(0).optional().default(0),
  /** `0` allowed for count-only payloads (tabs); default page size applies when omitted. */
  limit: z.coerce.number().int().min(0).max(MAX_PAGE).optional().default(DEFAULT_PAGE),
});

export type UserSocialListQuery = z.infer<typeof userSocialListQuerySchema>;

/** Query for GET following-objects list. */
export const userFollowingObjectsQuerySchema = z.object({
  sort: z.enum(['weight', 'recency']).optional().default('weight'),
  skip: z.coerce.number().int().min(0).optional().default(0),
  /** `0` allowed for total count without loading rows (shell tabs). */
  limit: z.coerce.number().int().min(0).max(MAX_PAGE).optional().default(DEFAULT_PAGE),
});

export type UserFollowingObjectsQuery = z.infer<typeof userFollowingObjectsQuerySchema>;
