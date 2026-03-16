import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_IDENTIFIER: UpdateDefinition = {
  update_type: UPDATE_TYPES.IDENTIFIER,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    value: z.string().min(1),
    type: z.string().min(1),
    image: z.string().url().optional(),
  }),
};
