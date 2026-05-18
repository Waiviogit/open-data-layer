import { z } from 'zod';
import { registry } from './registry';

const searchObjectResultSchema = registry.register(
  'SearchObjectResult',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    name: z.string().nullable(),
    image_url: z.string().nullable(),
    parent_name: z.string().nullable(),
  }),
);

const searchUserResultSchema = registry.register(
  'SearchUserResult',
  z.object({
    name: z.string(),
    profile_image: z.string().nullable(),
    reputation: z.number(),
    followers_count: z.number().int(),
    is_following: z.boolean(),
  }),
);

const searchResponseDtoSchema = registry.register(
  'SearchResponseDto',
  z.object({
    objects: z.array(searchObjectResultSchema),
    users: z.array(searchUserResultSchema),
    type_counts: z.record(z.string(), z.number().int()).openapi({
      description: 'Counts of returned objects keyed by `object_type` (e.g. product, business).',
    }),
    total_users: z.number().int(),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/search',
  summary: 'Predictive search (objects + users)',
  description:
    'Objects: full-text match on `name`, `title`, or `description` updates (`search_vector`), or substring `ILIKE` on `objects_core.object_id`; `status = active`; collapsed to one hit per `meta_group_id` (highest `weight`). Results are projected via `ObjectProjectionService` (`name`, `image`, `parent`). Users: prefix `ILIKE` on `accounts_current.name`, sorted by Waiv object weight and followers. Optional `X-Viewer` sets `is_following` via `user_subscriptions`. Respects `X-Governance-Object-Id` and locale like other read endpoints.',
  request: {
    query: z.object({
      q: z.string().min(1).max(100).openapi({ description: 'Search text.' }),
      limit: z.coerce.number().int().min(1).max(20).default(10).openapi({
        description: 'Max object hits (users capped internally at 5).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional Hive account for follow status on user rows and projection context.',
      }),
      'x-governance-object-id': z.string().optional().openapi({
        description: 'Optional governance merge (same as object resolve).',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Grouped object and user hits with per-type counts.',
      content: {
        'application/json': {
          schema: searchResponseDtoSchema,
        },
      },
    },
  },
});
