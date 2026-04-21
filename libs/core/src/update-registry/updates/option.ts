import { z } from 'zod';
import type { UpdateDefinition } from '../types';
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
    category: z.string().min(1),
    value: z.string().min(1),
    position: z.number().default(1),
    image: z.string().optional(),
  }),
};
