import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CALORIES: UpdateDefinition = {
  update_type: UPDATE_TYPES.CALORIES,
  description: 'Calorie count or range.',
  namespace: 'schema',
  localizable: true,
  semantic_key: 'calories',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
