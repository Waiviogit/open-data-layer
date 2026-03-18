import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MAP_OBJECTS_LIST: UpdateDefinition = {
  update_type: UPDATE_TYPES.MAP_OBJECTS_LIST,
  description: 'List of object IDs shown on map.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
