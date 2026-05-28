import { z } from 'zod';
import { registry } from './registry';

const discoverTagCategoryItemSchema = registry.register(
  'DiscoverTagCategoryItemDto',
  z.object({
    value: z.string(),
    count: z.number().int(),
  }),
);

const discoverTagCategorySectionSchema = registry.register(
  'DiscoverTagCategorySectionDto',
  z.object({
    category: z.string(),
    items: z.array(discoverTagCategoryItemSchema),
  }),
);

const discoverTagCategoriesResponseSchema = registry.register(
  'DiscoverTagCategoriesResponseDto',
  z.object({
    categories: z.array(discoverTagCategorySectionSchema),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/discover/tag-categories',
  summary: 'Tag category facets for discover filters',
  request: {
    query: z.object({
      object_type: z.string().min(1),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Tag values grouped by category for an object type.',
      content: {
        'application/json': {
          schema: discoverTagCategoriesResponseSchema,
        },
      },
    },
  },
});
