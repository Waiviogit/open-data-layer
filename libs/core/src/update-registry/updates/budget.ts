import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BUDGET: UpdateDefinition = {
  update_type: UPDATE_TYPES.BUDGET,
  namespace: 'odl',
  localizable: false,
  semantic_key: 'budget',
  description: 'Budget or price range.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
