import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_WEBSITE: UpdateDefinition = {
  update_type: UPDATE_TYPES.WEBSITE,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().url(),
};
