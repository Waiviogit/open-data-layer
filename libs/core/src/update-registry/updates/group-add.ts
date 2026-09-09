import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_ADD: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_ADD,
  namespace: 'odl',
  localizable: false,
  description: 'Group membership or add member.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
