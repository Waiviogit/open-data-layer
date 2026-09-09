import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_LIST_ITEM: UpdateDefinition = {
  update_type: UPDATE_TYPES.LIST_ITEM,
  description: 'List item or entry reference.',
  namespace: 'odl',
  localizable: false,
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: objectIdSchema,
};
