import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';
import { OBJECT_TYPES } from '../../object-type-registry/object-types';

export const UPDATE_BRAND: UpdateDefinition = {
  update_type: UPDATE_TYPES.BRAND,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'brand',
  description: 'Brand or manufacturer reference.',
  value_kind: 'object_ref',
  cardinality: 'single',
  applies_to: [OBJECT_TYPES.BUSINESS],
  schema: objectIdSchema,
};
