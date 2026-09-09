import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_COMPARE_AT_PRICE: UpdateDefinition = {
  update_type: UPDATE_TYPES.COMPARE_AT_PRICE,
  namespace: 'odl',
  localizable: true,
  description: 'Compare-at or original price.',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
