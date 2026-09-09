import type { UpdateDefinition } from '../types';
import { emailSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_EMAIL: UpdateDefinition = {
  update_type: UPDATE_TYPES.EMAIL,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'email',
  description: 'Email address or contact.',
  value_kind: 'text',
  cardinality: 'single',
  schema: emailSchema,
};
