import { z } from 'zod';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';

const shopTagCategoryItemSchema = registry.register(
  'UserShopTagCategoryItemDto',
  z.object({
    value: z.string(),
    count: z.number().int(),
  }),
);

const shopTagCategorySectionSchema = registry.register(
  'UserShopTagCategorySectionDto',
  z.object({
    category: z.string(),
    items: z.array(shopTagCategoryItemSchema),
  }),
);

const userShopFiltersResponseSchema = registry.register(
  'UserShopFiltersResponseDto',
  z.object({
    ratings: z.array(z.number().int()).openapi({
      description: 'Static rating thresholds (legacy 10-point scale: 10, 8, 6).',
    }),
    categories: z.array(shopTagCategorySectionSchema),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/shop-objects',
  tags: [queryApiOpenApiTags.users],
  summary: 'User shop / recipe object cards',
  description:
    'Paginated projected shop cards. Optional `country` overrides GeoIP for affiliate link geo cascade. Cards may include `fields.identifier` and `affiliateLinks`.',
  request: {
    params: z.object({
      name: z.string().min(1).openapi({ param: { name: 'name', in: 'path', required: true } }),
    }),
    query: z.object({
      types: z.union([z.string(), z.array(z.string())]).optional().openapi({
        description: 'Object types in shop scope (default book, product). Repeatable.',
      }),
      categoryPath: z.union([z.string(), z.array(z.string())]).optional().openapi({
        description: 'AND filter on category_names path segments.',
      }),
      uncategorizedOnly: z.union([z.boolean(), z.string()]).optional().openapi({
        description: 'When true, only objects with no category_names.',
      }),
      tags: z.union([z.string(), z.array(z.string())]).optional().openapi({
        description: 'Tag filters as category:value, combined with AND.',
      }),
      rating: z.coerce.number().optional().openapi({
        description: 'Minimum aggregate rating threshold (6, 8, or 10 legacy scale).',
      }),
      limit: z.coerce.number().int().min(1).max(50).optional().openapi({
        description: 'Page size (default 20, max 50).',
      }),
      cursor: z.string().optional().openapi({
        description: 'Opaque cursor (object_id).',
      }),
      country: z.string().trim().max(32).optional().openapi({
        description: 'ISO 3166-1 alpha-2 or affiliate geo token; overrides GeoIP when valid.',
      }),
    }),
  },
  responses: {
    200: { description: 'Projected shop objects with optional affiliateLinks.' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/shop-sections',
  tags: [queryApiOpenApiTags.users],
  summary: 'User shop / recipe category sections',
  description:
    'Grouped shop previews. Optional `country` overrides GeoIP for affiliate links on section items.',
  request: {
    params: z.object({
      name: z.string().min(1).openapi({ param: { name: 'name', in: 'path', required: true } }),
    }),
    query: z.object({
      types: z.union([z.string(), z.array(z.string())]).optional().openapi({
        description: 'Object types in shop scope.',
      }),
      name: z.string().optional().openapi({
        description: 'Parent department name for drill-down (omit at root).',
      }),
      path: z.union([z.string(), z.array(z.string())]).optional().openapi({
        description: 'Ancestor category names before name.',
      }),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      rating: z.coerce.number().optional(),
      cursor: z.string().optional().openapi({
        description: 'Last category name from previous page.',
      }),
      sectionLimit: z.coerce.number().int().min(1).max(10).optional().openapi({
        description: 'Max category sections per page (default 3).',
      }),
      country: z.string().trim().max(32).optional().openapi({
        description: 'ISO 3166-1 alpha-2 or affiliate geo token; overrides GeoIP when valid.',
      }),
    }),
  },
  responses: {
    200: { description: 'Shop sections with optional affiliateLinks on items.' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/shop/filters',
  tags: [queryApiOpenApiTags.users],
  summary: 'Shop tag and rating filter facets for a user catalog',
  description:
    'Returns tag category facets scoped to the user shop membership (authority ∪ post-linked − deselect) and optional categoryPath. Ratings are static thresholds.',
  request: {
    params: z.object({
      name: z.string().min(1).openapi({ param: { name: 'name', in: 'path', required: true } }),
    }),
    query: z.object({
      types: z.union([z.string(), z.array(z.string())]).optional(),
      categoryPath: z.union([z.string(), z.array(z.string())]).optional(),
      uncategorizedOnly: z.union([z.boolean(), z.string()]).optional(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Tag facets and rating thresholds for the user shop scope.',
      content: {
        'application/json': {
          schema: userShopFiltersResponseSchema,
        },
      },
    },
  },
});
