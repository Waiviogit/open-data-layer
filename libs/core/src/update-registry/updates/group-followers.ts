import type { UpdateDefinition } from '../types';
import { hiveAccountNameArraySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_FOLLOWERS: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_FOLLOWERS,
  namespace: 'odl',
  localizable: false,
  description: 'Group followers or audience config.',
  value_kind: 'json',
  cardinality: 'single',
  schema: hiveAccountNameArraySchema,
};
