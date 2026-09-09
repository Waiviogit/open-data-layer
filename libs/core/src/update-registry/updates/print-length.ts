import type { UpdateDefinition } from '../types';
import { numericStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PRINT_LENGTH: UpdateDefinition = {
  update_type: UPDATE_TYPES.PRINT_LENGTH,
  namespace: 'odl',
  localizable: false,
  description: 'Print or page length.',
  value_kind: 'text',
  cardinality: 'single',
  schema: numericStringSchema,
};
