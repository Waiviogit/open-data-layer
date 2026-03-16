import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_GROUP_MIN_EXPERTISE: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_MIN_EXPERTISE,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().regex(/^\d+$/, 'Must be a numeric string'),
};
