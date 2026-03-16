import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_PHONE: UpdateDefinition = {
  update_type: UPDATE_TYPES.PHONE,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
