import type { UpdateDefinition } from '../types';
import { descriptionSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_INPUT: UpdateDefinition = {
  update_type: UPDATE_TYPES.INPUT,
  namespace: 'odl',
  localizable: true,
  description: 'What the service takes as input.',
  value_kind: 'text',
  cardinality: 'single',
  schema: descriptionSchema,
};
