import { z } from 'zod';

/** Matches query-api subscription list sort (`GET .../followers` & `following`). */
export const USER_SUBSCRIPTION_SORTS = ['rank', 'followers', 'a-z', 'recency'] as const;
export type UserSubscriptionSort = (typeof USER_SUBSCRIPTION_SORTS)[number];

/** Matches query-api `GET .../following-objects` sort. */
export const USER_OBJECT_LIST_SORTS = ['weight', 'recency'] as const;
export type UserObjectListSort = (typeof USER_OBJECT_LIST_SORTS)[number];

export const userFollowListItemSchema = z.object({
  name: z.string(),
  avatarUrl: z.string().nullable(),
  wobjectsWeight: z.number(),
  usersFollowingCount: z.number(),
  isCurrentFollowing: z.boolean(),
});

export const paginatedUserFollowListSchema = z.object({
  items: z.array(userFollowListItemSchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export type UserFollowListView = z.infer<typeof userFollowListItemSchema>;
export type PaginatedUserFollowListView = z.infer<typeof paginatedUserFollowListSchema>;

/** Narrow JSON shape for followed objects (see query-api `ProjectedObject`). */
export const socialProjectedObjectSchema = z.object({
  object_id: z.string(),
  object_type: z.string(),
  semantic_type: z.string().nullable(),
  weight: z.number().nullable().optional(),
  fields: z.record(z.string(), z.unknown()),
  hasAdministrativeAuthority: z.boolean().optional().default(false),
  hasOwnershipAuthority: z.boolean().optional().default(false),
  seo: z.record(z.string(), z.unknown()).optional(),
});

export type SocialProjectedObjectView = z.infer<typeof socialProjectedObjectSchema>;

export const paginatedFollowingObjectsSchema = z.object({
  items: z.array(socialProjectedObjectSchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export type PaginatedFollowingObjectsView = z.infer<typeof paginatedFollowingObjectsSchema>;

/** Server action shape for `/followers` and `/following` load-more (pass the action reference; do not wrap). */
export type LoadMoreUserSocialAccountListFn = (
  profileAccountName: string,
  sort: UserSubscriptionSort,
  skip: number,
) => Promise<PaginatedUserFollowListView>;

/** Server action shape for `/following-objects` load-more. */
export type LoadMoreUserSocialObjectsFn = (
  profileAccountName: string,
  sort: UserObjectListSort,
  locale: string,
  skip: number,
) => Promise<PaginatedFollowingObjectsView>;

export function parseSubscriptionSortParam(raw: string | string[] | undefined): UserSubscriptionSort {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && USER_SUBSCRIPTION_SORTS.includes(v as UserSubscriptionSort)) {
    return v as UserSubscriptionSort;
  }
  return 'recency';
}

export function parseObjectListSortParam(raw: string | string[] | undefined): UserObjectListSort {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && USER_OBJECT_LIST_SORTS.includes(v as UserObjectListSort)) {
    return v as UserObjectListSort;
  }
  return 'weight';
}
