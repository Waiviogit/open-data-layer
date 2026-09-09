import type { UpdateDefinition } from '../types';
import { descriptionSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_NUTRITION: UpdateDefinition = {
  update_type: UPDATE_TYPES.NUTRITION,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'nutrition',
  description: 'Nutrition facts or summary.',
  value_kind: 'text',
  cardinality: 'single',
  schema: descriptionSchema,
};
