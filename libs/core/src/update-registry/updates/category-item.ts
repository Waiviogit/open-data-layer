import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CATEGORY_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.CATEGORY_ITEM,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    value: z.string().min(1),
    category: z.string().min(1),
  }),
};
