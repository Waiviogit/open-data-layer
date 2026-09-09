import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PARENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.PARENT,
  namespace: 'odl',
  localizable: false,
  description: 'Parent object or list reference.',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: objectIdSchema,
};
