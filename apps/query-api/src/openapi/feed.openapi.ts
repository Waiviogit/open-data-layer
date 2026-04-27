import { z } from 'zod';

import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const feedVoteSummarySchema = registry.register(
  'FeedVoteSummary',
  z.object({
    totalCount: z.number().int(),
    previewVoters: z.array(z.string()),
    voted: z.boolean(),
  }),
);

const authorProfileSnippetSchema = registry.register(
  'AuthorProfileSnippet',
  z.object({
    name: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    reputation: z.number(),
  }),
);

const feedStoryItemSchema = registry.register(
  'FeedStoryItem',
  z.object({
    id: z.string(),
    author: z.string(),
    permlink: z.string(),
    title: z.string(),
    excerpt: z.string(),
    createdAt: z.string().datetime({ offset: true }),
    feedAt: z.string().datetime({ offset: true }),
    rebloggedBy: z.string().nullable(),
    isNsfw: z.boolean(),
    category: z.string().nullable(),
    children: z.number().int(),
    pendingPayout: z.string(),
    totalPayout: z.string(),
    netRshares: z.string(),
    thumbnailUrl: z.string().nullable(),
    videoThumbnailUrl: z.string().nullable(),
    videoEmbedUrl: z.string().nullable(),
    authorProfile: authorProfileSnippetSchema,
    objects: z.array(projectedObjectOpenApiSchema),
    votes: feedVoteSummarySchema,
  }),
);

const userBlogFeedResponseSchema = registry.register(
  'UserBlogFeedResponse',
  z.object({
    items: z.array(feedStoryItemSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

const userBlogFeedBodySchema = registry.register(
  'UserBlogFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  }),
);

const userThreadsFeedBodySchema = registry.register(
  'UserThreadsFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    sort: z.enum(['latest', 'oldest']).optional(),
  }),
);

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

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{name}/blog',
  summary: 'User blog feed (posts and reblogs)',
  description:
    'Paginated newest-first feed: root posts by author plus reblogs, merged by time. Cursor is opaque (base64url JSON).',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional Hive account of the viewer; when set, each item `votes.voted` reflects whether they have an active vote.',
        example: 'alice',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: userBlogFeedBodySchema,
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      description: 'Feed page with items and optional next cursor.',
      content: {
        'application/json': {
          schema: userBlogFeedResponseSchema,
        },
      },
    },
    404: {
      description: 'No `accounts_current` row for `name`.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{name}/comments',
  summary: 'User profile comments feed (Hive)',
  description:
    'Paginated feed of comments authored by the profile via `condenser_api.get_discussions_by_comments`. No DB merge. Leo Threads replies are excluded; the API may perform multiple Hive round-trips per page to fill `limit`. Body matches threads (`sort` is ignored).',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional Hive account of the viewer; `votes.voted` uses `active_votes` from Hive.',
        example: 'alice',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: userThreadsFeedBodySchema,
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      description: 'Feed page; same schema as blog/threads.',
      content: {
        'application/json': {
          schema: userBlogFeedResponseSchema,
        },
      },
    },
    404: {
      description: 'No `accounts_current` row for `name`.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{name}/threads',
  summary: 'User profile threads feed (Leo/Ecency)',
  description:
    'Paginated feed of thread rows for a profile: threads that mention the profile or authored by them (excluding bulk_message). Respects viewer mutes (X-Viewer). Cursor matches blog feed encoding.',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional Hive account of the viewer; mutes apply; vote preview uses thread_active_votes.',
        example: 'alice',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: userThreadsFeedBodySchema,
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      description: 'Feed page; items use empty objects and payout fields for thread cards.',
      content: {
        'application/json': {
          schema: userBlogFeedResponseSchema,
        },
      },
    },
    404: {
      description: 'No `accounts_current` row for `name`.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
