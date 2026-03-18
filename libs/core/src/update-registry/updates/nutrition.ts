import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_NUTRITION: UpdateDefinition = {
  update_type: UPDATE_TYPES.NUTRITION,
  description: 'Nutrition facts or summary.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
