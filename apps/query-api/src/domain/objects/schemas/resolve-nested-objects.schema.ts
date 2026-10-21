import { UPDATE_REGISTRY } from '@opden-data-layer/core';
import { z } from 'zod';
import type { AffiliateLink } from '../../affiliate/affiliate.types';
import { countryQueryField } from '../../../http/country-query.schema';
import { NESTED_OBJECT_UPDATE_TYPES } from '../nested-object.constants';

const nestedDefaultUpdateTypesLabel = NESTED_OBJECT_UPDATE_TYPES.join(', ');

export const resolveNestedObjectsBodySchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(32)
    .describe('Object ids to resolve (max 32, lightweight projection)'),
  update_types: z
    .array(z.string().min(1))
    .max(64)
    .optional()
    .describe(
      `Subset of update types to resolve; omit or empty array = endpoint defaults (${nestedDefaultUpdateTypesLabel})`,
    )
    .superRefine((types, ctx) => {
      if (types == null) {
        return;
      }
      for (let i = 0; i < types.length; i++) {
        if (!(types[i] in UPDATE_REGISTRY)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `unknown update_type: ${types[i]}`,
            path: [i],
          });
        }
      }
    }),
  country: countryQueryField,
});

export type ResolveNestedObjectsBody = z.infer<typeof resolveNestedObjectsBodySchema>;

export type NestedObjectView = {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
  affiliateLinks?: AffiliateLink[];
};

export type ResolveNestedObjectsResponse = {
  items: NestedObjectView[];
};
