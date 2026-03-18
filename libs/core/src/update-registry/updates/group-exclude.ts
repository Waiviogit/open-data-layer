import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_EXCLUDE: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_EXCLUDE,
  description: 'Excluded member or account from group.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(3).max(16),
};
