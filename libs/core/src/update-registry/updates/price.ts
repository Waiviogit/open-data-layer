import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PRICE: UpdateDefinition = {
  update_type: UPDATE_TYPES.PRICE,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'price',
  description: 'Price or cost value.',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
