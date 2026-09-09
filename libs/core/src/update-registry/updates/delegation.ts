import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_DELEGATION: UpdateDefinition = {
  update_type: UPDATE_TYPES.DELEGATION,
  namespace: 'odl',
  localizable: false,
  description: 'Delegation or authority reference.',
  value_kind: 'user_ref',
  cardinality: 'single',
  schema: hiveAccountNameSchema,
};
