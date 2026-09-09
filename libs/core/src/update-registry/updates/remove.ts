import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_REMOVE: UpdateDefinition = {
  update_type: UPDATE_TYPES.REMOVE,
  namespace: 'odl',
  localizable: false,
  description: 'Soft-remove or hide reference.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: objectIdSchema,
};
