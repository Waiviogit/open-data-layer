import { z } from 'zod';
import { registry } from './registry';

const forbiddenSchema = z.object({
  statusCode: z.literal(403),
  message: z.string(),
  error: z.string(),
});

const unauthorizedSchema = z.object({
  statusCode: z.literal(401),
  message: z.string(),
  error: z.string(),
});

const notFoundSchema = z.object({
  statusCode: z.literal(404),
  message: z.string(),
  error: z.string(),
});

const userPostDraftViewSchema = registry.register(
  'UserPostDraftView',
  z.object({
    draftId: z.string(),
    author: z.string(),
    title: z.string(),
    body: z.string(),
    jsonMetadata: z.unknown(),
    parentAuthor: z.string(),
    parentPermlink: z.string(),
    permlink: z.string().nullable(),
    beneficiaries: z.unknown(),
    lastUpdated: z.number().int(),
  }),
);

const userPostDraftListResponseSchema = registry.register(
  'UserPostDraftListResponse',
  z.object({
    items: z.array(userPostDraftViewSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
);

const authorParam = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9.-]+$/)
  .openapi({
    param: {
      name: 'author',
      in: 'path',
      required: true,
    },
    description: 'Hive account name; must match JWT `sub`.',
    example: 'alice',
  });

const bearerSecurity = [{ bearerAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{author}/drafts',
  summary: 'Get draft list or a single draft',
  description:
    'Without `draftId`/`permlink`: paginated list (`limit`, `cursor`). With exactly one of `draftId` or `permlink`: one draft; for `permlink`, creates a draft from chain post if missing.',
  security: bearerSecurity,
  request: {
    params: z.object({ author: authorParam }),
    query: z.object({
      draftId: z.string().optional(),
      permlink: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List or single draft.',
      content: {
        'application/json': {
          schema: z.union([userPostDraftViewSchema, userPostDraftListResponseSchema]),
        },
      },
    },
    401: {
      description: 'Missing or invalid Bearer token.',
      content: { 'application/json': { schema: unauthorizedSchema } },
    },
    403: {
      description: '`author` does not match token subject.',
      content: { 'application/json': { schema: forbiddenSchema } },
    },
    404: {
      description: 'Draft or post not found (single-resource requests).',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

const bulkDeleteBody = z.object({
  draftIds: z.array(z.string().uuid()).min(1).max(50),
});

const bulkDeleteResultSchema = registry.register(
  'BulkDeleteUserPostDraftsResult',
  z.object({
    deleted: z.number().int().min(0),
  }),
);

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{author}/drafts/bulk-delete',
  summary: 'Delete multiple drafts',
  description:
    'Deletes drafts owned by `author` whose `draft_id` is in `draftIds`. Unknown ids are ignored; `deleted` is the number of rows removed.',
  security: bearerSecurity,
  request: {
    params: z.object({ author: authorParam }),
    body: {
      content: {
        'application/json': {
          schema: bulkDeleteBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Bulk delete result.',
      content: {
        'application/json': { schema: bulkDeleteResultSchema },
      },
    },
    401: {
      description: 'Missing or invalid Bearer token.',
      content: { 'application/json': { schema: unauthorizedSchema } },
    },
    403: {
      description: '`author` does not match token subject.',
      content: { 'application/json': { schema: forbiddenSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{author}/drafts',
  summary: 'Create a draft',
  security: bearerSecurity,
  request: {
    params: z.object({ author: authorParam }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().optional(),
            body: z.string().optional(),
            jsonMetadata: z.unknown().optional(),
            parentAuthor: z.string().optional(),
            parentPermlink: z.string().optional(),
            permlink: z.string().nullable().optional(),
            beneficiaries: z.unknown().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Created draft.',
      content: { 'application/json': { schema: userPostDraftViewSchema } },
    },
    401: {
      description: 'Missing or invalid Bearer token.',
      content: { 'application/json': { schema: unauthorizedSchema } },
    },
    403: {
      description: '`author` does not match token subject.',
      content: { 'application/json': { schema: forbiddenSchema } },
    },
  },
});

const mutateQuery = z.object({
  draftId: z.string().optional(),
  permlink: z.string().optional(),
});

const patchBody = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  jsonMetadata: z.unknown().optional(),
  parentAuthor: z.string().optional(),
  parentPermlink: z.string().optional(),
  permlink: z.string().nullable().optional(),
  beneficiaries: z.unknown().optional(),
});

registry.registerPath({
  method: 'patch',
  path: '/query/v1/users/{author}/drafts',
  summary: 'Update a draft',
  security: bearerSecurity,
  request: {
    params: z.object({ author: authorParam }),
    query: mutateQuery,
    body: {
      content: { 'application/json': { schema: patchBody } },
    },
  },
  responses: {
    200: {
      description: 'Updated draft.',
      content: { 'application/json': { schema: userPostDraftViewSchema } },
    },
    401: {
      description: 'Missing or invalid Bearer token.',
      content: { 'application/json': { schema: unauthorizedSchema } },
    },
    403: {
      description: '`author` does not match token subject.',
      content: { 'application/json': { schema: forbiddenSchema } },
    },
    404: {
      description: 'Draft or post not found.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/query/v1/users/{author}/drafts',
  summary: 'Update a draft (same as PATCH)',
  security: bearerSecurity,
  request: {
    params: z.object({ author: authorParam }),
    query: mutateQuery,
    body: {
      content: { 'application/json': { schema: patchBody } },
    },
  },
  responses: {
    200: {
      description: 'Updated draft.',
      content: { 'application/json': { schema: userPostDraftViewSchema } },
    },
    401: {
      description: 'Missing or invalid Bearer token.',
      content: { 'application/json': { schema: unauthorizedSchema } },
    },
    403: {
      description: '`author` does not match token subject.',
      content: { 'application/json': { schema: forbiddenSchema } },
    },
    404: {
      description: 'Draft or post not found.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/query/v1/users/{author}/drafts',
  summary: 'Delete a draft',
  security: bearerSecurity,
  request: {
    params: z.object({ author: authorParam }),
    query: mutateQuery,
  },
  responses: {
    204: {
      description: 'Deleted.',
    },
    401: {
      description: 'Missing or invalid Bearer token.',
      content: { 'application/json': { schema: unauthorizedSchema } },
    },
    403: {
      description: '`author` does not match token subject.',
      content: { 'application/json': { schema: forbiddenSchema } },
    },
    404: {
      description: 'Draft or post not found.',
      content: { 'application/json': { schema: notFoundSchema } },
    },
  },
});
