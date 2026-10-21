import { z } from 'zod';
import { countryQueryField } from '../../http/country-query.schema';

const MAX_PAGE = 50;
const DEFAULT_PAGE = 20;

export const userFavoritesQuerySchema = z.object({
  objectType: z
    .string()
    .min(1)
    .optional()
    .describe('Filter by object_type (must be in user favorites types)'),
  skip: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe('Offset for pagination'),
  limit: z.coerce
    .number()
    .int()
    .min(0)
    .max(MAX_PAGE)
    .optional()
    .default(DEFAULT_PAGE)
    .describe('Page size'),
  country: countryQueryField,
});

export type UserFavoritesQuery = z.infer<typeof userFavoritesQuerySchema>;

export const userFavoritesTypesResponseSchema = z.object({
  types: z.array(z.string()),
});

export type UserFavoritesTypesResponse = z.infer<typeof userFavoritesTypesResponseSchema>;
