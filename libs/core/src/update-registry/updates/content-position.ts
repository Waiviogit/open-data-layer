import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CONTENT_POSITION: UpdateDefinition = {
  update_type: UPDATE_TYPES.CONTENT_POSITION,
  namespace: 'odl',
  localizable: false,
  description: 'Content position or order.',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
