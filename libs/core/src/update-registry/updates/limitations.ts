import type { UpdateDefinition } from '../types';
import { descriptionSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_LIMITATIONS: UpdateDefinition = {
  update_type: UPDATE_TYPES.LIMITATIONS,
  namespace: 'odl',
  localizable: true,
  description: 'Constraints or limits of the service.',
  value_kind: 'text',
  cardinality: 'single',
  schema: descriptionSchema,
};
