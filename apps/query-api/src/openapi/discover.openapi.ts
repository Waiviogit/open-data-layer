import { z } from 'zod';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

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
  tags: [queryApiOpenApiTags.discover],
  summary: 'Tag category facets for discover filters',
  description:
    'Tag values grouped by category for an object type. Each count is the number of distinct active product groups (`COALESCE(meta_group_id, object_id)`), not individual option SKUs.',
  request: {
    query: z.object({
      object_type: z.string().min(1),
      q: z.string().max(100).optional(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      box: z.string().optional().describe('Map bounding box as swLng,swLat,neLng,neLat'),
    }),
  },
  responses: {
    200: {
      description:
        'Tag values grouped by category. Counts are distinct active meta_group_id groups.',
      content: {
        'application/json': {
          schema: discoverTagCategoriesResponseSchema,
        },
      },
    },
  },
});
