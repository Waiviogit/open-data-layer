import { z } from 'zod';
import { registry } from './registry';
import { userCategoriesQuerySchema } from '../domain/categories/categories-query.schema';

const itemSchema = registry.register(
  'CategoryNavItem',
  z.object({
    name: z.string(),
    objects_count: z.number().int().nonnegative(),
    has_children: z.boolean(),
  }),
);

const categoriesResponseSchema = registry.register(
  'UserCategoriesResponse',
  z.object({
    items: z.array(itemSchema),
    uncategorized_count: z.number().int().nonnegative(),
    show_other: z.boolean(),
  }),
);

const badRequestSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
  issues: z.unknown().optional(),
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/categories',
  summary: 'Shop departments for a user (authority + optional post-linked scope)',
  description:
    'Returns pre-aggregated categories from `object_categories_related` (`scope_type=user`) keyed by `scope_key=buildUserScopeKey(name, types)` (default types `book`,`product`). Root list when `name` query is omitted; drill-down when `name` and optional `path` are set.',
  request: {
    params: z.object({
      name: z
        .string()
        .min(1)
        .openapi({ param: { name: 'name', in: 'path', required: true } }),
    }),
    query: userCategoriesQuerySchema,
  },
  responses: {
    200: {
      description: 'Shop category navigation slice.',
      content: {
        'application/json': {
          schema: categoriesResponseSchema,
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
  },
});
