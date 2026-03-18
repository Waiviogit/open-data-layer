import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SHOP_FILTER: UpdateDefinition = {
  update_type: UPDATE_TYPES.SHOP_FILTER,
  description: 'Shop catalog filter configuration.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    type: z.string().min(1),
    departments: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    authorities: z.array(z.string()).optional(),
  }),
};
