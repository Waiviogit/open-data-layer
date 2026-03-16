import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_URL: UpdateDefinition = {
  update_type: UPDATE_TYPES.URL,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().url(),
};
