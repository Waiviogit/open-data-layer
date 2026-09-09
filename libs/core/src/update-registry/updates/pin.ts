import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PIN: UpdateDefinition = {
  update_type: UPDATE_TYPES.PIN,
  namespace: 'odl',
  localizable: false,
  description: 'Pinned item or object reference.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: objectIdSchema,
};
