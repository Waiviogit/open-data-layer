import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { labelSchema, urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IDENTIFIER: UpdateDefinition = {
  update_type: UPDATE_TYPES.IDENTIFIER,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'identifier',
  description: 'External or alternate identifier.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    value: labelSchema,
    type: labelSchema,
    image: urlStringSchema.optional(),
  }),
};
