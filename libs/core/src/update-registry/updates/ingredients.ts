import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_INGREDIENTS: UpdateDefinition = {
  update_type: UPDATE_TYPES.INGREDIENTS,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'ingredients',
  description: 'Recipe ingredients list.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.array(z.string().min(1)).min(1),
};
