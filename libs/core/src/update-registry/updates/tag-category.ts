import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TAG_CATEGORY: UpdateDefinition = {
  update_type: UPDATE_TYPES.TAG_CATEGORY,
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
