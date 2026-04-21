import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_COOKING_TIME: UpdateDefinition = {
  update_type: UPDATE_TYPES.COOKING_TIME,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'cookTime',
  description: 'Cooking or prep time.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
