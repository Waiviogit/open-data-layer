import { z } from 'zod';
import { resolveObjectBodySchema } from '../domain/objects/schemas/resolve-object.schema';
import { projectedObjectOpenApiSchema } from './projected-object.schema';
import {
  paginatedUserFollowListOpenApiSchema,
  subscriptionSortEnum,
} from './users-social.openapi';
import { registry } from './registry';

const projectedObjectWithCountsSchema = registry.register(
  'ProjectedObjectWithCounts',
  projectedObjectOpenApiSchema.extend({
    followers_count: z.number().int(),
    posts_count: z.number().int(),
    updates_count: z.number().int(),
    administrative_count: z.number().int(),
    ownership_count: z.number().int(),
    is_following: z.boolean(),
    viewer_bell: z.boolean(),
    update_type_counts: z.record(z.string(), z.number().int()),
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

const resolveObjectRequestSchema = registry.register('ResolveObjectBody', resolveObjectBodySchema);

registry.registerPath({
  method: 'post',
  path: '/query/v1/objects/resolve',
  summary: 'Resolve projected object by id',
  description:
    'Loads aggregated DB rows for `object_id`, resolves fields via `ObjectViewService`, projects to `ProjectedObject` JSON (IPFS URLs, ref summaries, authority flags). When `update_types` is omitted or empty, every update type present on the object is resolved. Only `objects_core` rows with `status = active` are loaded. Includes `followers_count` from `user_object_follows`, `posts_count` from `post_objects` (Reviews feed size), `updates_count` as total rows in `object_updates`, `update_type_counts` as per-type row counts from `object_updates`, and `administrative_count` / `ownership_count` from `object_authority` for this object. When `X-Viewer` is set, includes `is_following` and `viewer_bell` from `user_object_follows` for that account and object. The `fields.aggregateRating` value (when requested) is an array of aspect rows: `{ update_id, dimension, averageRating (0–10000 or null), userRating (viewer’s vote when `X-Viewer` is set, 0–10000 or null), totalVoters }` from `rank_votes` aggregates. Returns 404 when the object does not exist.',
  request: {
    headers: z.object({
      'accept-language': z.string().optional().openapi({
        example: 'en-US',
        description: 'Preferred locale (first BCP-47 tag is used).',
      }),
      'x-locale': z.string().optional().openapi({
        description: 'When valid, overrides `Accept-Language`.',
      }),
      'x-governance-object-id': z.string().optional().openapi({
        description:
          'Optional governance object ID; resolved and merged with platform governance from `GOVERNANCE_OBJECT_ID`.',
      }),
      'x-viewer': z.string().optional().openapi({
        description:
          'Optional Hive account viewing the object; used for `hasAdministrativeAuthority`, `hasOwnershipAuthority`, and each `fields.aggregateRating[]` row\'s `userRating` (resolved from `rank_votes` for that viewer, latest `event_seq` per aspect `update_id`).',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: resolveObjectRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Projected object with follower, update, and authority counts.',
      content: {
        'application/json': {
          schema: projectedObjectWithCountsSchema,
        },
      },
    },
    400: {
      description: 'Request body validation failed (Zod).',
      content: {
        'application/json': {
          schema: badRequestSchema,
        },
      },
    },
    404: {
      description: 'No `objects_core` row for `object_id`, non-active `status`, or object not returned by resolution.',
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
  path: '/query/v1/objects/{objectId}/followers',
  summary: 'List accounts that follow the object',
  description:
    'Joins `user_object_follows` (where `object_id` matches an active object) with `accounts_current`. Sort options match user-profile followers (`rank`, `followers`, `a-z`, `recency` on follow edge or account fields). Optional `X-Viewer` populates `isCurrentFollowing` via `user_subscriptions`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      sort: z.enum(subscriptionSortEnum).optional().openapi({
        description:
          '`rank` = wobjects_weight desc; `followers` = users_following_count desc; `a-z` = name asc; `recency` = object follow created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/hasMore only (no rows).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional viewer account; populates `isCurrentFollowing` per row.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated follower accounts.',
      content: {
        'application/json': {
          schema: paginatedUserFollowListOpenApiSchema,
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

registry.registerPath({
  method: 'get',
  path: '/query/v1/objects/{objectId}/authority',
  summary: 'List accounts with administrative or ownership authority on the object',
  description:
    'Joins `object_authority` (for an active object) with `accounts_current`. Filter rows with `authority_type` (`administrative` | `ownership`). Sort options match user-profile followers (`rank`, `followers`, `a-z`, `recency` on authority edge or account fields). Optional `X-Viewer` populates `isCurrentFollowing` via `user_subscriptions`.',
  request: {
    params: z.object({
      objectId: z
        .string()
        .min(1)
        .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
    }),
    query: z.object({
      authority_type: z.enum(['administrative', 'ownership']).openapi({
        description: 'Which authority role to list.',
      }),
      sort: z.enum(subscriptionSortEnum).optional().openapi({
        description:
          '`rank` = wobjects_weight desc; `followers` = users_following_count desc; `a-z` = name asc; `recency` = authority row created_at desc.',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce.number().int().min(0).max(50).optional().openapi({
        description: 'Page size; use `0` for total/hasMore only (no rows).',
      }),
    }),
    headers: z.object({
      'x-viewer': z.string().optional().openapi({
        description: 'Optional viewer account; populates `isCurrentFollowing` per row.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated authority accounts.',
      content: {
        'application/json': {
          schema: paginatedUserFollowListOpenApiSchema,
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

const refSummaryOpenApiSchema = registry.register(
  'RefSummary',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    fields: z.record(z.string(), z.unknown()),
    weight: z.number().nullable(),
    addedAtUnix: z.number().optional(),
    listItemsCount: z.number().int().optional(),
    hasAdministrativeAuthority: z.boolean().optional(),
  }),
);

const objectRefListResponseSchema = registry.register(
  'ObjectRefListResponse',
  z.object({
    items: z.array(refSummaryOpenApiSchema),
    hasMore: z.boolean(),
    cursor: z.string().nullable(),
  }),
);

const objectRefListQueryOpenApi = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().openapi({
    description: 'Page size (default 20, max 50).',
  }),
  cursor: z.string().optional().openapi({
    description: 'Offset cursor (numeric string) for the next page.',
  }),
});

function registerObjectRefListPath(
  pathSuffix: 'related' | 'similar' | 'add-on',
  summary: string,
  description: string,
): void {
  registry.registerPath({
    method: 'get',
    path: `/query/v1/objects/{objectId}/${pathSuffix}`,
    summary,
    description,
    request: {
      params: z.object({
        objectId: z
          .string()
          .min(1)
          .openapi({ param: { name: 'objectId', in: 'path', required: true } }),
      }),
      query: objectRefListQueryOpenApi,
      headers: z.object({
        'accept-language': z.string().optional().openapi({
          description: 'Preferred locale (first BCP-47 tag is used).',
        }),
        'x-locale': z.string().optional().openapi({
          description: 'When valid, overrides `Accept-Language`.',
        }),
        'x-governance-object-id': z.string().optional().openapi({
          description:
            'Optional governance object ID; merged with platform governance from `GOVERNANCE_OBJECT_ID`.',
        }),
        'x-viewer': z.string().optional().openapi({
          description:
            'Optional Hive account; sets `hasAdministrativeAuthority` on each ref when the viewer has administrative authority on that object.',
        }),
      }),
    },
    responses: {
      200: {
        description: 'Paginated referenced objects.',
        content: {
          'application/json': {
            schema: objectRefListResponseSchema,
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
}

registerObjectRefListPath(
  'related',
  'List related objects',
  'Returns VALID `isRelatedTo` refs on the source object first, then backfills from `object_categories` using legacy close-products **related** rules: categories whose global count is ≥ the average across the source object’s categories; matches objects in any of those categories. Response rows are compact `RefSummary` projections. Pagination: numeric offset `cursor` (default page size 20, max 50).',
);
registerObjectRefListPath(
  'similar',
  'List similar objects',
  'Returns VALID `isSimilarTo` refs first, then backfills from `object_categories` using legacy **similar** rules: iterate source categories sorted by global count ascending; one category at a time, excluding objects that share already-used categories. Response rows are compact `RefSummary` projections. Pagination: numeric offset `cursor`.',
);
registerObjectRefListPath(
  'add-on',
  'List add-on objects',
  'Returns VALID `addOn` refs on the source object first, then backfills with objects that have an `addOn` update pointing at the source object id (reverse add-on). Response rows are compact `RefSummary` projections. Pagination: numeric offset `cursor`.',
);
