import { z } from 'zod';
import { objectUpdatesFeedQuerySchema } from '../domain/object-updates/schemas/object-updates-feed.schema';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

const objectUpdateFeedItemSchema = registry.register(
  'ObjectUpdateFeedItem',
  z.object({
    update_id: z.string(),
    object_id: z.string(),
    update_type: z.string(),
    creator: z.string(),
    creator_wobjects_weight: z.number(),
    locale: z.string().nullable(),
    created_at_unix: z.number().int(),
    transaction_id: z.string(),
    value_text: z.string().nullable(),
    value_geo: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .nullable(),
    value_json: z.unknown().nullable(),
    image_preview_urls: z.array(z.string()),
    approve_percent: z.number(),
    for_vote_count: z.number().int(),
    against_vote_count: z.number().int(),
    for_preview_voters: z.array(z.string()),
    against_preview_voters: z.array(z.string()),
    viewer_vote: z.enum(['for', 'against']).nullable(),
    decisive_privileged_vote: z
      .object({
        tier: z.enum(['admin', 'trusted']),
        vote: z.enum(['for', 'against']),
        voter: z.string(),
      })
      .nullable(),
    rank_score: z.number().nullable(),
    viewer_rank: z.number().nullable(),
  }),
);

const objectUpdatesFeedResponseSchema = registry.register(
  'ObjectUpdatesFeedResponse',
  z.object({
    items: z.array(objectUpdateFeedItemSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

const badRequestSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
  issues: z.unknown().optional(),
});

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/updates',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Paginated object updates with approval percent and vote counts',
  description:
    'Lists `object_updates` for an active object with `approve_percent` from governance + `computeApprovePercent`, community for/against counts, the viewer’s latest validity vote and **`viewer_rank`** (rank channel) when `X-Viewer` is set, plus persisted **`rank_score`** per update. Sort `recency` uses keyset cursor; sort `approval` loads up to 1000 matching rows then sorts in memory (offset cursor).',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: objectUpdatesFeedQuerySchema,
    headers: z.object({
      'x-governance-object-id': z.string().optional().openapi({
        description: 'Optional governance object merged for approval computation.',
      }),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional viewer account; populates `viewer_vote` and `viewer_rank` per item when set.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Page of updates.',
      content: {
        'application/json': {
          schema: objectUpdatesFeedResponseSchema,
        },
      },
    },
    400: {
      description: 'Query validation failed (Zod).',
      content: {
        'application/json': {
          schema: badRequestSchema,
        },
      },
    },
    404: {
      description: 'Object not found or not active.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});

const updateVoterProfileSchema = registry.register(
  'UpdateVoterProfile',
  z.object({
    name: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
);

const updateVoterRowSchema = registry.register(
  'UpdateVoterRow',
  z.object({
    voter: z.string(),
    event_seq: z.string(),
    waiv_power: z.number().describe('30-day time-weighted average WAIV power used for vote weight'),
    privileged_tier: z.enum(['admin', 'trusted']).nullable(),
    profile: updateVoterProfileSchema,
  }),
);

const updateVotersResponseSchema = registry.register(
  'UpdateVotersResponse',
  z.object({
    for_count: z.number().int(),
    against_count: z.number().int(),
    for_voters: z.array(updateVoterRowSchema),
    against_voters: z.array(updateVoterRowSchema),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/updates/{updateId}',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Single object update feed item',
  description:
    'Returns one update card payload (same shape as feed items) for deep links from notifications. Includes `rank_score` and `viewer_rank` when applicable.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
      updateId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'updateId', in: 'path', required: true } }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional viewer account; populates `viewer_vote` and `viewer_rank` when set.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Object update feed item.',
      content: {
        'application/json': {
          schema: objectUpdateFeedItemSchema,
        },
      },
    },
    404: {
      description: 'Object or update not found.',
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
  path: '/query/v1/objects/{objectId}/updates/{updateId}/voters',
  tags: [queryApiOpenApiTags.objects],
  summary: 'Validity voters for a single object update',
  description:
    'Lists usernames who approved or rejected an update (latest vote per voter). Used by the web vote report modal.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
      updateId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'updateId', in: 'path', required: true } }),
    }),
  },
  responses: {
    200: {
      description: 'Approve and reject voter lists.',
      content: {
        'application/json': {
          schema: updateVotersResponseSchema,
        },
      },
    },
    404: {
      description: 'Object update not found.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
