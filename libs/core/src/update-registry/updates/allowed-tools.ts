import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_ALLOWED_TOOLS: UpdateDefinition = {
  update_type: UPDATE_TYPES.ALLOWED_TOOLS,
  namespace: 'odl',
  localizable: false,
  description: 'Allowed tool name or pattern for the skill.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: labelSchema,
};
