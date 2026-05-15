import { z } from 'zod';

import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const accountNameParam = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9.-]+$/)
  .openapi({
    param: {
      name: 'name',
      in: 'path',
      required: true,
    },
    description: 'Hive account name (URL segment).',
    example: 'demo',
  });

const userFollowListItemSchema = registry.register(
  'UserFollowListItem',
  z.object({
    name: z.string().openapi({ description: '`accounts_current.name`' }),
    avatarUrl: z.string().nullable().openapi({ description: '`accounts_current.profile_image`.' }),
    wobjectsWeight: z.number().openapi({ description: '`accounts_current.wobjects_weight`.' }),
    usersFollowingCount: z
      .number()
      .openapi({ description: '`accounts_current.users_following_count` (followers of this row).' }),
    isCurrentFollowing: z.boolean().openapi({
      description:
        'True when the request viewer (`X-Viewer`) has a `user_subscriptions` edge to this account.',
    }),
  }),
);

const paginatedUserFollowListSchema = registry.register(
  'PaginatedUserFollowList',
  z.object({
    items: z.array(userFollowListItemSchema),
    total: z.number().int(),
    hasMore: z.boolean(),
  }),
);

const paginatedProjectedObjectsSchema = registry.register(
  'PaginatedProjectedObjects',
  z.object({
    items: z.array(projectedObjectOpenApiSchema),
    total: z.number().int(),
    hasMore: z.boolean(),
  }),
);

/** Shared with `objects.openapi` (object follower accounts). */
export const subscriptionSortEnum = ['rank', 'followers', 'a-z', 'recency'] as const;

/** Shared response schema for user-profile and object follower lists. */
export const paginatedUserFollowListOpenApiSchema = paginatedUserFollowListSchema;

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/followers',
  summary: 'List accounts that follow the profile',
  description:
    'Joins `user_subscriptions` (where `following` = name) with `accounts_current` for display fields. Optional `X-Viewer` populates `isCurrentFollowing`.',
  request: {
    params: z.object({ name: accountNameParam }),
    query: z.object({
      sort: z.enum(subscriptionSortEnum).optional().openapi({
        description:
          '`rank` = wobjects_weight desc; `followers` = users_following_count desc; `a-z` = name asc; `recency` = subscription created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/`hasMore` only (no rows).',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated follower accounts.',
      content: { 'application/json': { schema: paginatedUserFollowListSchema } },
    },
    404: {
      description: 'Profile not in `accounts_current`.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/following',
  summary: 'List accounts the profile follows',
  description:
    'Joins `user_subscriptions` (where `follower` = name) with `accounts_current`. Optional `X-Viewer` populates `isCurrentFollowing`.',
  request: {
    params: z.object({ name: accountNameParam }),
    query: z.object({
      sort: z.enum(subscriptionSortEnum).optional(),
      skip: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total only.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated following accounts.',
      content: { 'application/json': { schema: paginatedUserFollowListSchema } },
    },
    404: {
      description: 'Profile not in `accounts_current`.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/following-objects',
  summary: 'List objects the profile follows',
  description:
    'Reads `user_object_follows` joined with `objects_core`, resolves `name` and `image` updates, returns `ProjectedObject` JSON (including `weight`).',
  request: {
    params: z.object({ name: accountNameParam }),
    query: z.object({
      sort: z.enum(['weight', 'recency']).optional().openapi({
        description: '`weight` = objects_core.weight desc; `recency` = follow created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for tab total without loading rows.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated projected objects.',
      content: { 'application/json': { schema: paginatedProjectedObjectsSchema } },
    },
    404: {
      description: 'Profile not in `accounts_current`.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});
