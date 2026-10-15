import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SERVINGS: UpdateDefinition = {
  update_type: UPDATE_TYPES.SERVINGS,
  description: 'Number of servings or yield.',
  namespace: 'schema',
  localizable: true,
  semantic_key: 'servings',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
