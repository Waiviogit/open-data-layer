import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_SALE: UpdateDefinition = {
  update_type: UPDATE_TYPES.SALE,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
