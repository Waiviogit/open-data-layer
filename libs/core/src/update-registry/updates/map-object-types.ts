import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MAP_OBJECT_TYPES: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_OBJECT_TYPES,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(z.string().min(1)).min(1),
};
