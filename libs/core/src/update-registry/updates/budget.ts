import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BUDGET: UpdateDefinition = {
  update_type: UPDATE_TYPES.BUDGET,
  namespace: 'odl',
  localizable: true,
  semantic_key: 'budget',
  description: 'Budget or price range.',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
