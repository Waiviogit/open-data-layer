import type { UpdateDefinition } from '../types';
import { hiveAccountNameArraySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_FOLLOWING: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_FOLLOWING,
  namespace: 'odl',
  localizable: false,
  description: 'Groups this object follows.',
  value_kind: 'json',
  cardinality: 'single',
  schema: hiveAccountNameArraySchema,
};
