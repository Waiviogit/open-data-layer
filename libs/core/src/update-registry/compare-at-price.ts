import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_COMPARE_AT_PRICE: UpdateDefinition = {
  update_type: UPDATE_TYPES.COMPARE_AT_PRICE,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
