import type { UpdateDefinition } from '../types';
import { bodySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_LEGAL_TEXT: UpdateDefinition = {
  update_type: UPDATE_TYPES.LEGAL_TEXT,
  namespace: 'odl',
  localizable: true,
  description: 'Legal document body (markdown).',
  value_kind: 'text',
  cardinality: 'single',
  schema: bodySchema,
};
