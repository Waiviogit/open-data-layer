import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';
import { OBJECT_TYPES } from '../../object-type-registry/object-types';

export const UPDATE_MANUFACTURER: UpdateDefinition = {
  update_type: UPDATE_TYPES.MANUFACTURER,
  description: 'Manufacturer or maker details.',
  namespace: 'schema',
  localizable: false,
  semantic_key: 'manufacturer',
  value_kind: 'object_ref',
  cardinality: 'single',
  applies_to: [OBJECT_TYPES.BUSINESS],
  schema: objectIdSchema,
};
