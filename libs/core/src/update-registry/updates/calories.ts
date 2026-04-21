import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CALORIES: UpdateDefinition = {
  update_type: UPDATE_TYPES.CALORIES,
  description: 'Calorie count or range.',
  namespace: 'schema',
  localizable: true,
  semantic_key: 'calories',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
