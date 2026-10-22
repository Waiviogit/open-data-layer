import { z } from 'zod';
import { countryQueryField } from '../../http/country-query.schema';

export const instacartLinkQuerySchema = z.object({
  country: countryQueryField,
});

export type InstacartLinkQuery = z.infer<typeof instacartLinkQuerySchema>;
