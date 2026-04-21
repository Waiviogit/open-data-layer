import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_COOK_TIME: UpdateDefinition = {
  update_type: UPDATE_TYPES.COOK_TIME,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'cookTime',
  description: 'Cooking or prep time.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
