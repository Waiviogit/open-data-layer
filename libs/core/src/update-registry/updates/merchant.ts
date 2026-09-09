import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MERCHANT: UpdateDefinition = {
  update_type: UPDATE_TYPES.MERCHANT,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'merchant',
  description: 'Merchant or seller reference.',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: objectIdSchema,
};
