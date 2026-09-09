import type { UpdateDefinition } from '../types';
import { urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AFFILIATE_BUTTON: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_BUTTON,
  namespace: 'odl',
  localizable: false,
  description: 'Affiliate button or link label.',
  value_kind: 'text',
  cardinality: 'single',
  schema: urlStringSchema,
};
