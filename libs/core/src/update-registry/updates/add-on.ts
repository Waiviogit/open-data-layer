import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_ADD_ON: UpdateDefinition = {
  update_type: UPDATE_TYPES.ADD_ON,
  semantic_key: 'addOn',
  namespace: 'schema',
  localizable: false,
  description: 'Add-on or upsell reference.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: objectIdSchema,
};
