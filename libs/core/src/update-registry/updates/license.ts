import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_LICENSE: UpdateDefinition = {
  update_type: UPDATE_TYPES.LICENSE,
  namespace: 'odl',
  localizable: false,
  description: 'License name for the skill (not a file reference).',
  value_kind: 'text',
  cardinality: 'single',
  schema: labelSchema,
};
