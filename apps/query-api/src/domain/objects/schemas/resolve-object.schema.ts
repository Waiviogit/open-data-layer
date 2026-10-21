import { z } from 'zod';
import { countryQueryField } from '../../../http/country-query.schema';

export const resolveObjectBodySchema = z.object({
  object_id: z
    .string()
    .min(1, 'object_id is required')
    .describe('Object id (URL-encoded id accepted on HTTP)'),
  update_types: z
    .array(z.string())
    .default([])
    .describe('Subset of update types to resolve; empty array = all present on object'),
  include_rejected: z
    .boolean()
    .optional()
    .describe('Include rejected updates in projection when true'),
  country: countryQueryField,
});

export type ResolveObjectBody = z.infer<typeof resolveObjectBodySchema>;
