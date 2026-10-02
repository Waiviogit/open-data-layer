import { z } from 'zod';

import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

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
    avatarUrl: z.string().nullable().openapi({
      description:
        'Profile avatar from `posting_json_metadata.profile.profile_image`, falling back to `json_metadata.profile.profile_image`, then `accounts_current.profile_image`.',
    }),
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

export { accountNameParam, paginatedProjectedObjectsSchema };

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/followers',
  tags: [queryApiOpenApiTags.users],
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
  tags: [queryApiOpenApiTags.users],
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
  tags: [queryApiOpenApiTags.users],
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

const followedObjectsMessageSchema = registry.register(
  'FollowedObjectsMessage',
  z.object({
    message_id: z.string(),
    channel_id: z.string(),
    author: z.string(),
    body: z.string().nullable(),
    encrypted_body: z.string().nullable(),
    encryption: z
      .object({
        v: z.number().int(),
        mode: z.enum(['memo', 'ephemeral']),
        to: z.string(),
      })
      .nullable(),
    overflow_ref: z.string().nullable(),
    reply_to: z.string().nullable(),
    quote_json: z.unknown().nullable(),
    attachments: z.unknown().nullable(),
    mentions: z.array(z.string()),
    created_at_unix: z.number().int(),
    original_created_at_unix: z.number().int().nullable(),
    updated_at_unix: z.number().int().nullable(),
    source_object: z.null(),
    source: z
      .object({
        platform: z.string(),
        id: z.string(),
      })
      .nullable(),
    duplicate_of: z.string().nullable(),
    duplicate_count: z.number().int(),
    object: z.object({
      object_id: z.string(),
      name: z.string().openapi({
        description: 'Native object channel title, or `object_id` when the channel has no title.',
      }),
    }),
  }),
);

const followedObjectsMessagesResponseSchema = registry.register(
  'FollowedObjectsMessagesResponse',
  z.object({
    items: z.array(followedObjectsMessageSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{name}/following-objects/messages',
  tags: [queryApiOpenApiTags.users],
  summary: 'Message feed across objects the profile follows',
  description:
    'Public read of object-channel messages for active `user_object_follows` of `{name}`, plus mention cross-posts, deduped by `message_id`. Ordered by `COALESCE(original_created_at_unix, created_at_unix) DESC, event_seq DESC`. Optional `X-Viewer` and `X-Governance-Object-Id` apply mute filters only; they do not change whose follows are read.',
  request: {
    params: z.object({ name: accountNameParam }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            limit: z.number().int().min(1).max(100).optional().openapi({
              description: 'Page size. Default 50.',
            }),
            cursor: z.string().optional(),
            for_context: z.boolean().optional(),
            include_duplicates: z.boolean().optional().openapi({
              description: 'When omitted or false, only canonical rows (`message_id = dup_group_id`).',
            }),
            authors_only: z.boolean().optional().openapi({
              description:
                'When true, return only activity whose author is in the governance authors list.',
            }),
            authors_governance_object_id: z.string().min(1).optional().openapi({
              description:
                'Optional second governance object id whose authors are unioned into the allowlist. Ignored unless authors_only is true.',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Keyset page. Empty follow set is an empty page, not 404.',
      content: {
        'application/json': { schema: followedObjectsMessagesResponseSchema },
      },
    },
    404: {
      description: 'Profile not in `accounts_current`.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

const userAccountAuthGrantorItemSchema = registry.register(
  'UserAccountAuthGrantorItem',
  z.object({
    grantor: z.string().openapi({ description: 'Hive account that delegated authority' }),
    authorityType: z.enum(['owner', 'active', 'posting']).openapi({
      description: 'Authority type delegated to the profile',
    }),
    avatarUrl: z.string().nullable(),
    wobjectsWeight: z.number(),
    usersFollowingCount: z.number().int(),
  }),
);

const paginatedUserAccountAuthGrantorsSchema = registry.register(
  'PaginatedUserAccountAuthGrantors',
  z.object({
    items: z.array(userAccountAuthGrantorItemSchema),
    total: z.number().int(),
    hasMore: z.boolean(),
  }),
);

const userAccountAuthGranteeItemSchema = registry.register(
  'UserAccountAuthGranteeItem',
  z.object({
    grantee: z.string().openapi({ description: 'Hive account receiving delegated authority' }),
    authorityType: z.enum(['owner', 'active', 'posting']),
    avatarUrl: z.string().nullable(),
    wobjectsWeight: z.number(),
    usersFollowingCount: z.number().int(),
  }),
);

const paginatedUserAccountAuthGranteesSchema = registry.register(
  'PaginatedUserAccountAuthGrantees',
  z.object({
    items: z.array(userAccountAuthGranteeItemSchema),
    total: z.number().int(),
    hasMore: z.boolean(),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/authority-grantors',
  tags: [queryApiOpenApiTags.users],
  summary: 'List accounts that delegated Hive authority to the profile',
  description:
    'Reverse lookup on `user_account_auths` — who granted `owner`, `active`, or `posting` account auth to `{name}`.',
  request: {
    params: z.object({ name: accountNameParam }),
    query: z.object({
      type: z.enum(['owner', 'active', 'posting']).optional().openapi({
        description: 'Filter by authority type; omit for all types.',
      }),
      sort: z.enum(['rank', 'followers', 'a-z', 'recency']).optional().openapi({
        description:
          'Sort order: rank (wobjects_weight desc), followers (users_following_count desc), a-z (name asc), recency (updated_at_block desc). Default a-z.',
      }),
      skip: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(0).max(100).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated grantor list.',
      content: {
        'application/json': { schema: paginatedUserAccountAuthGrantorsSchema },
      },
    },
    404: {
      description: 'Profile not in `accounts_current`.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/authority-grantees',
  tags: [queryApiOpenApiTags.users],
  summary: 'List accounts that received Hive authority from the profile',
  description: 'Forward lookup on `user_account_auths` for `{name}` as grantor.',
  request: {
    params: z.object({ name: accountNameParam }),
    query: z.object({
      type: z.enum(['owner', 'active', 'posting']).optional().openapi({
        description: 'Filter by authority type; omit for all types.',
      }),
      sort: z.enum(['rank', 'followers', 'a-z', 'recency']).optional().openapi({
        description:
          'Sort order: rank (wobjects_weight desc), followers (users_following_count desc), a-z (name asc), recency (updated_at_block desc). Default a-z.',
      }),
      skip: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(0).max(100).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Paginated grantee list.',
      content: {
        'application/json': { schema: paginatedUserAccountAuthGranteesSchema },
      },
    },
    404: {
      description: 'Profile not in `accounts_current`.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});
