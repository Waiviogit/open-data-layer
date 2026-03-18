import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_FOLLOWING: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_FOLLOWING,
  description: 'Groups this object follows.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(z.string().min(1)),
};
