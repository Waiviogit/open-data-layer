import { z } from 'zod';
import { resolveObjectBodySchema } from '../domain/objects/schemas/resolve-object.schema';
import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';

const projectedObjectWithCountsSchema = registry.register(
  'ProjectedObjectWithCounts',
  projectedObjectOpenApiSchema.extend({
    followers_count: z.number().int(),
    updates_count: z.number().int(),
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
    'Loads aggregated DB rows for `object_id`, resolves fields via `ObjectViewService`, projects to `ProjectedObject` JSON (IPFS URLs, ref summaries, authority flags). When `update_types` is omitted or empty, every update type present on the object is resolved. Only `objects_core` rows with `status = active` are loaded. Includes `followers_count` from `user_object_follows` and `updates_count` as total rows in `object_updates` for this object. Returns 404 when the object does not exist.',
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
          'Optional Hive account viewing the object; used for `hasAdministrativeAuthority`, `hasOwnershipAuthority`, and aggregate rating viewer vote.',
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
      description: 'Projected object with follower and update counts.',
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
