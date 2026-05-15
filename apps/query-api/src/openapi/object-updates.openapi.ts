import { z } from 'zod';
import { objectUpdatesFeedQuerySchema } from '../domain/object-updates/schemas/object-updates-feed.schema';
import { registry } from './registry';

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
    viewer_vote: z.enum(['for', 'against']).nullable(),
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
  summary: 'Paginated object updates with approval percent and vote counts',
  description:
    'Lists `object_updates` for an active object with `approve_percent` from governance + `computeApprovePercent`, community for/against counts, and the viewer’s latest validity vote when `X-Viewer` is set. Sort `recency` uses keyset cursor; sort `approval` loads up to 1000 matching rows then sorts in memory (offset cursor).',
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
        description: 'Optional viewer account; populates `viewer_vote` per item when set.',
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
