import type { UpdateDefinition } from '../types';
import { descriptionSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_OUTPUT: UpdateDefinition = {
  update_type: UPDATE_TYPES.OUTPUT,
  namespace: 'odl',
  localizable: true,
  description: 'What the service produces as output.',
  value_kind: 'text',
  cardinality: 'single',
  schema: descriptionSchema,
};
