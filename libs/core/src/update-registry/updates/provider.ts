import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';
import { OBJECT_TYPES } from '../../object-type-registry/object-types';

export const UPDATE_PROVIDER: UpdateDefinition = {
  update_type: UPDATE_TYPES.PROVIDER,
  namespace: 'odl',
  localizable: false,
  description: 'Business that provides or is asked to provide this service.',
  value_kind: 'object_ref',
  cardinality: 'single',
  applies_to: [OBJECT_TYPES.BUSINESS],
  schema: objectIdSchema,
};
