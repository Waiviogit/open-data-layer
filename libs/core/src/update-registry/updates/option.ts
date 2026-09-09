import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { labelSchema, urlOrCidStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_OPTION: UpdateDefinition = {
  update_type: UPDATE_TYPES.OPTION,
  description: 'Product or variant options.',
  value_kind: 'json',
  cardinality: 'multi',
  namespace: 'schema',
  localizable: true,
  semantic_key: 'option',
  schema: z.object({
    category: labelSchema,
    value: labelSchema,
    position: z.number().default(1),
    image: urlOrCidStringSchema.optional(),
  }),
};
