import type { UpdateDefinition } from '../types';
import { bodySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PAGE_CONTENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.PAGE_CONTENT,
  namespace: 'odl',
  localizable: true,
  description: 'Page body or main content.',
  value_kind: 'text',
  cardinality: 'single',
  schema: bodySchema,
};
