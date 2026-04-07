import { z } from 'zod';
import { resolveObjectBodySchema } from '../domain/objects/schemas/resolve-object.schema';
import { registry } from './registry';

const validityStatusSchema = z.enum(['VALID', 'REJECTED']);

const resolvedUpdateSchema = registry.register(
  'ResolvedUpdate',
  z.object({
    update_id: z.string(),
    update_type: z.string(),
    creator: z.string(),
    locale: z.string().nullable().openapi({
      description: 'BCP-47 tag from the update row; null means language-neutral.',
    }),
    created_at_unix: z.number().int(),
    event_seq: z.string().openapi({
      description:
        'Monotonic sequence (bigint in domain). Represented as string when serialized to JSON.',
    }),
    value_text: z.string().nullable(),
    value_json: z.unknown().nullable().openapi({ description: 'JSON value when present.' }),
    validity_status: validityStatusSchema,
    field_weight: z.number().nullable(),
    rank_score: z.number().nullable(),
    rank_context: z.string().nullable(),
  }),
);

const resolvedFieldSchema = registry.register(
  'ResolvedField',
  z.object({
    update_type: z.string(),
    cardinality: z.enum(['single', 'multi']),
    values: z.array(resolvedUpdateSchema),
  }),
);

const resolvedObjectViewSchema = registry.register(
  'ResolvedObjectView',
  z.object({
    object_id: z.string(),
    object_type: z.string(),
    creator: z.string(),
    weight: z.number().nullable(),
    meta_group_id: z.string().nullable(),
    fields: z.record(z.string(), resolvedFieldSchema).openapi({
      description: 'Keyed by update_type. Only requested update_types are present.',
    }),
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
  summary: 'Resolve object view by id',
  description:
    'Loads aggregated DB rows for `object_id`, applies `ObjectViewService` with the given `update_types` and locale (from headers). When `update_types` is omitted or empty, every update type present on the object is resolved. Returns a `ResolvedObjectView` or 404 when the object does not exist.',
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
      description: 'Resolved object view for the requested update types.',
      content: {
        'application/json': {
          schema: resolvedObjectViewSchema,
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
      description: 'No `objects_core` row for `object_id`, or object not returned by resolution.',
      content: {
        'application/json': {
          schema: notFoundSchema,
        },
      },
    },
  },
});
