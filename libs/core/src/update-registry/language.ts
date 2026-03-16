import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_LANGUAGE: UpdateDefinition = {
  update_type: UPDATE_TYPES.LANGUAGE,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
