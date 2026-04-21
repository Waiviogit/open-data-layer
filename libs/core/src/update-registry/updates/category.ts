import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CATEGORY: UpdateDefinition = {
  update_type: UPDATE_TYPES.CATEGORY,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'category',
  description: 'Department or category list.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
