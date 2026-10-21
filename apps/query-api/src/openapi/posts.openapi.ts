import { SUPPORTED_CURRENCIES } from '@opden-data-layer/core';
import { z } from 'zod';

import { feedStoryItemSchema, postRewardSchema } from './feed.openapi';
import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const singlePostViewSchema = registry.register(
  'SinglePostView',
  z.object({
    id: z.string(),
    author: z.string(),
    permlink: z.string(),
    title: z.string(),
    excerpt: z.string(),
    body: z.string(),
    createdAt: z.string().datetime({ offset: true }),
    feedAt: z.string().datetime({ offset: true }),
    rebloggedBy: z.string().nullable(),
    rebloggedByViewer: z.boolean(),
    isNsfw: z.boolean(),
    category: z.string().nullable(),
    children: z.number().int(),
    pendingPayout: z.string(),
    totalPayout: z.string(),
    netRshares: z.string(),
    thumbnailUrl: z.string().nullable(),
    videoThumbnailUrl: z.string().nullable(),
    videoEmbedUrl: z.string().nullable(),
    authorProfile: z.object({
      name: z.string(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      reputation: z.number(),
      wobjectsWeight: z.number(),
    }),
    objects: z.array(projectedObjectOpenApiSchema),
    votes: z.object({
      totalCount: z.number().int(),
      previewVoters: z.array(z.string()),
      voted: z.boolean(),
    }),
    reward: postRewardSchema.nullable(),
    waivRewardEligible: z.boolean(),
  }),
);

const currencyQueryParam = z
  .enum(SUPPORTED_CURRENCIES)
  .optional()
  .default('USD')
  .openapi({
    param: {
      name: 'currency',
      in: 'query',
      required: false,
    },
    description: 'Fiat currency for `reward` labels (default USD).',
    example: 'USD',
  });

const authorParam = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9.-]+$/)
  .openapi({
    param: {
      name: 'author',
      in: 'path',
      required: true,
    },
    description: 'Hive account name (post author).',
    example: 'alice',
  });

const permlinkParam = z
  .string()
  .min(1)
  .max(255)
  .openapi({
    param: {
      name: 'permlink',
      in: 'path',
      required: true,
    },
    description: 'Hive permlink (URL segment; may require encoding).',
    example: 'my-post-title',
  });

registry.registerPath({
  method: 'get',
  path: '/query/v1/posts/{author}/{permlink}',
  tags: [queryApiOpenApiTags.posts],
  summary: 'Single post by author and permlink',
  description:
    'Full post body plus tagged objects (resolved fields for linked-object cards when available) and active vote summary. Optional `X-Viewer` sets administrative heart state per object. Not found when the post row is missing.',
  request: {
    params: z.object({ author: authorParam, permlink: permlinkParam }),
    query: z.object({
      currency: currencyQueryParam,
      country: z.string().trim().max(32).optional().openapi({
        description: 'ISO 3166-1 alpha-2 or affiliate geo token; overrides GeoIP when valid.',
      }),
    }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'Hive account viewing the post; when set, linked objects include `isFavorited` for `object_favorite` rows.',
        example: 'alice',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Post payload.',
      content: {
        'application/json': {
          schema: singlePostViewSchema,
        },
      },
    },
    404: {
      description: 'No `posts` row for this author/permlink.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

const discussionCommentSchema = registry.register(
  'DiscussionComment',
  feedStoryItemSchema.extend({ body: z.string() }),
);

const postDiscussionResponseSchema = registry.register(
  'PostDiscussionResponse',
  z.object({
    rootAuthor: z.string(),
    rootPermlink: z.string(),
    rebloggedUsers: z.array(z.string()),
    rebloggedByViewer: z.boolean(),
    rootCommentIds: z.array(z.string()),
    childrenById: z.record(z.string(), z.array(z.string())),
    comments: z.record(z.string(), discussionCommentSchema),
  }),
);

const postVoterRowSchema = registry.register(
  'PostVoterRow',
  z.object({
    voter: z.string(),
    percent: z.number(),
    valueUsd: z.number(),
    valueLabel: z.string(),
    profile: z.object({
      name: z.string(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    }),
  }),
);

const postVotersPageSchema = registry.register(
  'PostVotersPage',
  z.object({
    upvoteCount: z.number().int(),
    downvoteCount: z.number().int(),
    items: z.array(postVoterRowSchema),
    nextCursor: z.string().nullable(),
  }),
);

const votersDirectionQuery = z
  .enum(['up', 'down'])
  .openapi({
    param: { name: 'direction', in: 'query', required: true },
    description: 'Upvotes or downvotes tab.',
    example: 'up',
  });

const votersContentTypeQuery = z
  .enum(['post', 'thread'])
  .optional()
  .default('post')
  .openapi({
    param: { name: 'contentType', in: 'query', required: false },
    description: 'Hive post (default) or thread row.',
    example: 'post',
  });

const votersLimitQuery = z.coerce
  .number()
  .int()
  .min(1)
  .max(20)
  .optional()
  .openapi({
    param: { name: 'limit', in: 'query', required: false },
    description: 'Page size (default 20, max 20).',
    example: 20,
  });

const votersCursorQuery = z.string().optional().openapi({
  param: { name: 'cursor', in: 'query', required: false },
  description: 'Opaque cursor from `nextCursor` of the previous page.',
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/posts/{author}/{permlink}/voters',
  tags: [queryApiOpenApiTags.posts],
  summary: 'Paginated voters for a post or thread',
  description:
    'On-demand voter list for the reactions modal: per-voter profile, vote weight %, and USD value. Uses `post_active_votes` (or `thread_active_votes` when `contentType=thread`); falls back to Hive `get_active_votes` when the DB has no rows.',
  request: {
    params: z.object({ author: authorParam, permlink: permlinkParam }),
    query: z.object({
      direction: votersDirectionQuery,
      contentType: votersContentTypeQuery,
      limit: votersLimitQuery,
      cursor: votersCursorQuery,
      currency: currencyQueryParam,
    }),
  },
  responses: {
    200: {
      description: 'Voter page.',
      content: {
        'application/json': {
          schema: postVotersPageSchema,
        },
      },
    },
    404: {
      description: 'Post/thread not found or no voter data.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/posts/{author}/{permlink}/discussion',
  tags: [queryApiOpenApiTags.posts],
  summary: 'Post discussion thread (Hive bridge)',
  description:
    'Full comment tree for a post via `bridge.get_discussion`. No ODL DB merge for comment bodies in v1.',
  request: {
    params: z.object({ author: authorParam, permlink: permlinkParam }),
    query: z.object({ currency: currencyQueryParam }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Viewer account for per-comment `votes.voted` and `rebloggedByViewer` on root.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Discussion tree.',
      content: {
        'application/json': {
          schema: postDiscussionResponseSchema,
        },
      },
    },
    404: {
      description: 'Discussion not found on Hive.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
