import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_EXPERTISE: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_EXPERTISE,
  description: 'Group expertise or focus areas.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(z.string().min(1)),
};
