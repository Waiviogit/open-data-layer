import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_EXCLUDE: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_EXCLUDE,
  namespace: 'odl',
  localizable: false,
  description: 'Excluded member or account from group.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
