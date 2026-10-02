import { SUPPORTED_CURRENCIES } from '@opden-data-layer/core';
import { z } from 'zod';

import {
  feedUnreadCountsResponseSchema,
  markProfileFeedReadBodySchema,
  markProfileFeedReadResponseSchema,
} from '../domain/feed/feed-unread.schema';
import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

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
    wobjectsWeight: z.number(),
  }),
);

const moneyLineSchema = registry.register(
  'MoneyLine',
  z.object({
    amount: z.number(),
    currency: z.string(),
    label: z.string(),
  }),
);

const postRewardBeneficiarySchema = registry.register(
  'PostRewardBeneficiary',
  z.object({
    account: z.string(),
    percent: z.number(),
    payout: moneyLineSchema.optional(),
  }),
);

const postRewardBreakdownSchema = registry.register(
  'PostRewardBreakdown',
  z.object({
    waiv: moneyLineSchema,
    hive: moneyLineSchema,
    hbd: moneyLineSchema,
    total: moneyLineSchema,
    authorPayout: moneyLineSchema.optional(),
    curatorPayout: moneyLineSchema.optional(),
  }),
);

export const postRewardSchema = registry.register(
  'PostReward',
  z.object({
    amount: z.number(),
    currency: z.string(),
    label: z.string(),
    phase: z.enum(['potential', 'paid']),
    breakdown: postRewardBreakdownSchema,
    beneficiaries: z.array(postRewardBeneficiarySchema).optional(),
    cashoutAt: z.string().datetime({ offset: true }).optional(),
    isPayoutDeclined: z.boolean().optional(),
    payoutLimitHit: z.boolean().optional(),
    promotionCost: moneyLineSchema.optional(),
    rewardPowerOnly: z.boolean().optional(),
  }),
);

export const feedStoryItemSchema = registry.register(
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
    authorProfile: authorProfileSnippetSchema,
    objects: z.array(projectedObjectOpenApiSchema),
    votes: feedVoteSummarySchema,
    reward: postRewardSchema.nullable(),
    waivRewardEligible: z.boolean(),
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

const feedCurrencyBodyField = z
  .enum(SUPPORTED_CURRENCIES)
  .optional()
  .openapi({
    description: 'Fiat currency for `reward` labels (default USD).',
    example: 'USD',
  });

const userBlogFeedBodySchema = registry.register(
  'UserBlogFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    currency: feedCurrencyBodyField,
    object_ids: z
      .array(z.string().min(1))
      .max(20)
      .optional()
      .openapi({
        description:
          'When non-empty, only posts (and reblogs) linked to every listed object via `post_objects` (AND).',
      }),
  }),
);

const userBlogObjectFilterItemSchema = registry.register(
  'UserBlogObjectFilterItem',
  z.object({
    object_id: z.string(),
    name: z.string(),
    count: z.number().int(),
  }),
);

const userBlogObjectFiltersResponseSchema = registry.register(
  'UserBlogObjectFiltersResponse',
  z.object({
    items: z.array(userBlogObjectFilterItemSchema),
  }),
);

const userBlogObjectFiltersQuerySchema = registry.register(
  'UserBlogObjectFiltersQuery',
  z.object({
    objects: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .openapi({
        description:
          'Repeated query param: active object_id filters (AND) to narrow facet counts.',
      }),
  }),
);

const userThreadsFeedBodySchema = registry.register(
  'UserThreadsFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    sort: z.enum(['latest', 'oldest']).optional(),
    currency: feedCurrencyBodyField,
  }),
);

const objectThreadsFeedBodyOpenApi = registry.register(
  'ObjectThreadsFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    sort: z.enum(['latest', 'oldest']).optional(),
    currency: feedCurrencyBodyField,
    authors_only: z.boolean().optional().openapi({
      description:
        'When true, return only threads whose author is in the governance authors list.',
    }),
    authors_governance_object_id: z.string().min(1).optional().openapi({
      description:
        'Optional second governance object id whose authors are unioned into the allowlist. Ignored unless authors_only is true.',
    }),
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
  method: 'get',
  path: '/query/v1/users/{name}/blog/object-filters',
  tags: [queryApiOpenApiTags.users],
  summary: 'User blog post object filters (facets)',
  description:
    'Lists objects appearing on the profile blog feed (own root posts + reblogs) with post counts. When `objects` query params are set, facets and counts reflect posts that contain all active filters (AND). Names come from object projection with `object_id` fallback.',
  request: {
    params: z.object({ name: accountNameParam }),
    query: userBlogObjectFiltersQuerySchema,
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Facet list sorted by count descending.',
      content: {
        'application/json': {
          schema: userBlogObjectFiltersResponseSchema,
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
  path: '/query/v1/users/{name}/blog',
  tags: [queryApiOpenApiTags.users],
  summary: 'User blog feed (posts and reblogs)',
  description:
    'Paginated newest-first feed: root posts by author plus reblogs, merged by time. Cursor is opaque (base64url JSON). Optional `object_ids` filters posts that link to every id (AND) via `post_objects`.',
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
  path: '/query/v1/users/{name}/mentions',
  tags: [queryApiOpenApiTags.users],
  summary: 'User profile mentions feed',
  description:
    'Paginated newest-first posts where `post_mentions.account` matches the profile (case-insensitive). Posts authored by the profile account are excluded (no self-posts, including self-mentions). Same response shape as blog feed; authors muted by `X-Viewer` are excluded.',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional Hive account of the viewer; excludes posts authored by accounts they mute. `votes.voted` uses `post_active_votes`.',
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
  tags: [queryApiOpenApiTags.userThreads],
  summary: 'User profile comments feed (Hive)',
  description:
    'Paginated feed of comments authored by the profile via `condenser_api.get_discussions_by_comments`. No DB merge. Leo Threads replies are excluded; the API may perform multiple Hive round-trips per page to fill `limit`. Body matches threads (`sort` is ignored). Item `title` falls back to Hive `root_title` when the comment `title` is empty.',
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
  tags: [queryApiOpenApiTags.userThreads],
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

const objectPostsFeedBodySchema = registry.register(
  'ObjectPostsFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    currency: feedCurrencyBodyField,
  }),
);

registry.registerPath({
  method: 'post',
  path: '/query/v1/objects/{objectId}/posts',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Object posts feed (Reviews tab)',
  description:
    'Paginated newest-first posts for an object (legacy `getPostsByObject`): linked via `post_objects`, group siblings, relisted sources, link/mention/url matches, optional `newsFeed` filter for `newsfeed` objects. Pinned posts appear first on the initial page. Same response shape as user blog feed.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    body: {
      content: {
        'application/json': {
          schema: objectPostsFeedBodySchema,
        },
      },
      required: false,
    },
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
  },
  responses: {
    200: {
      description: 'Feed page.',
      content: {
        'application/json': {
          schema: userBlogFeedResponseSchema,
        },
      },
    },
    404: {
      description: 'Object not found.',
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
  path: '/query/v1/objects/{objectId}/threads',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Object threads feed (Reviews > Threads tab)',
  description:
    'Paginated threads whose `hashtags` array contains the object id (legacy `getThreads.byHashtag`). Respects viewer mutes (X-Viewer). Optional authors_only restricts to governance authors; authors_governance_object_id unions a second governance authors list. Cursor matches blog/user-threads feed encoding. No locale filter (unlike object posts).',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    body: {
      content: {
        'application/json': {
          schema: objectThreadsFeedBodyOpenApi,
        },
      },
      required: false,
    },
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
      description: 'Object not found.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

const homeFeedBodySchema = registry.register(
  'HomeFeedBody',
  z.object({
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
    currency: feedCurrencyBodyField,
  }),
);

registry.registerPath({
  method: 'post',
  path: '/query/v1/posts/feed',
  tags: [queryApiOpenApiTags.posts],
  summary: 'Hub home feed (global or personalized)',
  description:
    'Guest (no X-Viewer): all root posts newest-first. Logged-in viewer: posts by followed authors, posts linked to followed objects, or posts linked to objects where the viewer has administrative or ownership authority.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: homeFeedBodySchema,
        },
      },
      required: false,
    },
    headers: z.object({
      'accept-language': z.string().optional(),
      'x-locale': z.string().optional(),
      'x-governance-object-id': z.string().optional(),
      'x-viewer': z.string().optional().openapi({
        description:
          'When set, returns a personalized feed for this account instead of the global guest feed.',
        example: 'alice',
      }),
    }),
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
  },
});

const forbiddenSchema = z.object({
  statusCode: z.literal(403),
  message: z.string(),
  error: z.string(),
});

const feedUnreadCountsResponseOpenApiSchema = registry.register(
  'FeedUnreadCountsResponse',
  feedUnreadCountsResponseSchema,
);

const markProfileFeedReadBodyOpenApiSchema = registry.register(
  'MarkProfileFeedReadBody',
  markProfileFeedReadBodySchema,
);

const markProfileFeedReadResponseOpenApiSchema = registry.register(
  'MarkProfileFeedReadResponse',
  markProfileFeedReadResponseSchema,
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/feed-unread-counts',
  tags: [queryApiOpenApiTags.users],
  summary: 'Profile feed unread badge counts',
  description:
    'Returns unread reply counts for posts and threads tabs plus total messaging unread when `X-Viewer` matches `:name`; otherwise 403.',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'x-viewer': z.string().openapi({
        description: 'Hive account of the viewer; must match `:name`.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Unread counts per profile feed tab.',
      content: {
        'application/json': {
          schema: feedUnreadCountsResponseOpenApiSchema,
        },
      },
    },
    403: {
      description: 'Viewer does not match account.',
      content: {
        'application/json': {
          schema: forbiddenSchema,
        },
      },
    },
    404: {
      description: 'Account not found.',
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
  path: '/query/v1/users/{name}/feed-read',
  tags: [queryApiOpenApiTags.users],
  summary: 'Mark profile feed tab as read',
  description:
    'Monotonically advances posts or threads read cursor in `user_metadata` when `X-Viewer` matches `:name`. Messages tab is a no-op (channel cursors handle messaging read state).',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'x-viewer': z.string().openapi({
        description: 'Hive account of the viewer; must match `:name`.',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: markProfileFeedReadBodyOpenApiSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Updated cursor state for the tab.',
      content: {
        'application/json': {
          schema: markProfileFeedReadResponseOpenApiSchema,
        },
      },
    },
    403: {
      description: 'Viewer does not match account.',
      content: {
        'application/json': {
          schema: forbiddenSchema,
        },
      },
    },
    404: {
      description: 'Account not found.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
