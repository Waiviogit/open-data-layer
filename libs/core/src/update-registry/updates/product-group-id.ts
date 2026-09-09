import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PRODUCT_GROUP_ID: UpdateDefinition = {
  update_type: UPDATE_TYPES.PRODUCT_GROUP_ID,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'productGroupID',
  description: 'Group or community identifier.',
  value_kind: 'text',
  cardinality: 'single',
  schema: labelSchema,
};
