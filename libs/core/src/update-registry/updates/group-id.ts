import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_ID: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_ID,
  description: 'Group or community identifier.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
