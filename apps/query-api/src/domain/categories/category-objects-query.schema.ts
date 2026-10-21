import { z } from 'zod';
import { countryQueryField } from '../../http/country-query.schema';

const MAX_PAGE = 50;
const DEFAULT_PAGE = 20;

export const categoryObjectsQuerySchema = z.object({
  name: z.string().min(1).describe('Department category name (exact match in category_names)'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE)
    .default(DEFAULT_PAGE)
    .describe('Page size (max 50)'),
  cursor: z
    .string()
    .optional()
    .describe('Opaque cursor from previous page (weight + object_id keyset)'),
  exclude_object_id: z
    .string()
    .optional()
    .describe('Optional object id to omit from results (e.g. source object page host)'),
  country: countryQueryField,
});

export type CategoryObjectsQuery = z.infer<typeof categoryObjectsQuerySchema>;
