import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_MAP_OBJECT_TAGS: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_OBJECT_TAGS,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(z.string().min(1)),
};
