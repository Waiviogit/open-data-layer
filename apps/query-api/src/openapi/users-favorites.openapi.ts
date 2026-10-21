import { z } from 'zod';

import { userFavoritesMapBodySchema } from '../domain/favorites/post-user-favorites-map.schema';
import { projectedObjectOpenApiSchema } from './projected-object.schema';
import { registry } from './registry';
import { queryApiOpenApiTags } from './tags';
import { accountNameParam, paginatedProjectedObjectsSchema } from './users-social.openapi';

const favoritesLocaleHeader = z.string().optional().openapi({
  description: 'Preferred locale (first BCP-47 tag is used).',
});

const favoritesViewerHeader = z.string().optional().openapi({
  description:
    'Hive account name of the authenticated viewer. Populates per-object viewer fields on projected objects.',
});

const userFavoritesTypesResponseSchema = registry.register(
  'UserFavoritesTypesResponse',
  z.object({
    types: z
      .array(z.string())
      .openapi({ description: 'Object types present in favorites, sorted by count descending.' }),
  }),
);

const userFavoritesMapResponseSchema = registry.register(
  'UserFavoritesMapResponse',
  z.object({
    items: z.array(projectedObjectOpenApiSchema),
    hasMore: z.boolean(),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/favorites/types',
  tags: [queryApiOpenApiTags.users],
  summary: 'List object types in user favorites',
  description:
    'Distinct `object_type` values from favorites scope (administrative authority ∪ post-linked), sorted by count descending. Returns `{ types: [] }` for unknown or blank account names (no 404).',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': favoritesLocaleHeader,
      'x-locale': favoritesLocaleHeader,
      'x-viewer': favoritesViewerHeader,
    }),
  },
  responses: {
    200: {
      description: 'Type list for sidebar navigation.',
      content: { 'application/json': { schema: userFavoritesTypesResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/query/v1/users/{name}/favorites',
  tags: [queryApiOpenApiTags.users],
  summary: 'List user favorite objects',
  description:
    'Paginated favorites: `object_favorite` ∪ optional `post_objects`, filtered by `FAVORITES_OBJECT_TYPES`, `user_shop_deselect`, and `hide_favorite_objects`. Unknown account names return an empty page (`items: []`, `total: 0`) rather than 404. Blank `name` returns `null` body.',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': favoritesLocaleHeader,
      'x-locale': favoritesLocaleHeader,
      'x-viewer': favoritesViewerHeader,
    }),
    query: z.object({
      objectType: z.string().min(1).optional().openapi({
        description: 'Filter to one object type (must be in favorites types list).',
      }),
      skip: z.coerce.number().int().min(0).optional().openapi({ description: 'Pagination offset.' }),
      limit: z.coerce
        .number()
        .int()
        .min(0)
        .max(50)
        .optional()
        .openapi({ description: 'Page size.' }),
      country: z.string().trim().max(32).optional().openapi({
        description: 'ISO 3166-1 alpha-2 or affiliate geo token; overrides GeoIP when valid.',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated projected objects.',
      content: { 'application/json': { schema: paginatedProjectedObjectsSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/query/v1/users/{name}/favorites/map',
  tags: [queryApiOpenApiTags.users],
  summary: 'Geo-filtered user favorites for profile map',
  description:
    'Favorites scope intersected with `MAP_GEO_OBJECT_TYPES` and objects whose latest `geo` update falls inside `box`. Returns projected objects with `fields.geo` when available. Unknown users get `{ items: [], hasMore: false }`.',
  request: {
    params: z.object({ name: accountNameParam }),
    headers: z.object({
      'accept-language': favoritesLocaleHeader,
      'x-locale': favoritesLocaleHeader,
      'x-viewer': favoritesViewerHeader,
    }),
    body: {
      content: {
        'application/json': {
          schema: userFavoritesMapBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Map markers or sidebar list page.',
      content: { 'application/json': { schema: userFavoritesMapResponseSchema } },
    },
  },
});

export { userFavoritesTypesResponseSchema, userFavoritesMapResponseSchema };
