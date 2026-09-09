import type { UpdateDefinition } from '../types';
import { hiveAccountNameArraySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_EXPERTISE: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_EXPERTISE,
  namespace: 'odl',
  localizable: false,
  description: 'Group expertise or focus areas.',
  value_kind: 'json',
  cardinality: 'single',
  schema: hiveAccountNameArraySchema,
};
