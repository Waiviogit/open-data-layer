import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_FEATURED: UpdateDefinition = {
  update_type: UPDATE_TYPES.FEATURED,
  namespace: 'odl',
  localizable: false,
  description: 'Featured item or object reference.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: objectIdSchema,
};
