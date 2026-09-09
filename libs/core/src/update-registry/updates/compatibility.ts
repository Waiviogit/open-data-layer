import type { UpdateDefinition } from '../types';
import { compatibilitySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_COMPATIBILITY: UpdateDefinition = {
  update_type: UPDATE_TYPES.COMPATIBILITY,
  namespace: 'odl',
  localizable: false,
  description:
    'Environment requirements: intended products, system packages, network access, etc.',
  value_kind: 'text',
  cardinality: 'single',
  schema: compatibilitySchema,
};
