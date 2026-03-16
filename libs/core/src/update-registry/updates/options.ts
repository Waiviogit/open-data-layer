import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_OPTIONS: UpdateDefinition = {
  update_type: UPDATE_TYPES.OPTIONS,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    category: z.string().min(1),
    value: z.string().min(1),
    position: z.number().optional(),
    image: z.string().optional(),
  }),
};
