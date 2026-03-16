import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_ADD: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_ADD,
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(3).max(16),
};
