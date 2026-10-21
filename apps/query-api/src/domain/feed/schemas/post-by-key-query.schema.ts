import { z } from 'zod';
import { countryQueryField } from '../../../http/country-query.schema';

export const postByKeyQuerySchema = z.object({
  country: countryQueryField,
});

export type PostByKeyQuery = z.infer<typeof postByKeyQuerySchema>;
