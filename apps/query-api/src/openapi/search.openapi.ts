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
  }),
);

const searchCountsResponseDtoSchema = registry.register(
  'SearchCountsResponseDto',
  z.object({
    type_counts: z.record(z.string(), z.number().int()).openapi({
      description:
        'Global count of unique active objects per `object_type` for query `q` (meta_group deduped).',
    }),
    total_users: z.number().int().openapi({
      description: 'Total users matching the name prefix for query `q` (not capped).',
    }),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/search',
  summary: 'Predictive search (objects + users)',
  description:
    'Objects: autocomplete FTS on `name`, `title`, or `description` updates (`search_vector`), or optional substring on `object_id` when id-shaped; `status = active`; collapsed to one hit per `meta_group_id` (highest `weight`). Results are projected via `ObjectProjectionService` (`name`, `image`, `parent`). Users: prefix btree range on `accounts_current.name`, sorted by Waiv object weight and followers (max 5). Optional `X-Viewer` sets `is_following` via `user_subscriptions`. Respects `X-Governance-Object-Id` and locale like other read endpoints. Tab counts: use `GET /search/counts`.',
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
      description: 'Object and user hits for the current page (no global tab counts).',
      content: {
        'application/json': {
          schema: searchResponseDtoSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/search/counts',
  summary: 'Predictive search global counts',
  description:
    'Returns global `type_counts` (unique active objects per `object_type`, meta_group deduped) and `total_users` for query `q`. Same FTS / id-substring / name-prefix rules as `GET /search`. Intended for header tab badges loaded after the main search response.',
  request: {
    query: z.object({
      q: z.string().min(1).max(100).openapi({ description: 'Search text.' }),
    }),
  },
  responses: {
    200: {
      description: 'Global counts for tab badges.',
      content: {
        'application/json': {
          schema: searchCountsResponseDtoSchema,
        },
      },
    },
  },
});
