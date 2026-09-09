import type { UpdateDefinition } from '../types';
import { shortTokenSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IN_LANGUAGE: UpdateDefinition = {
  update_type: UPDATE_TYPES.IN_LANGUAGE,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'inLanguage',
  description: 'Language or locale code.',
  value_kind: 'text',
  cardinality: 'single',
  schema: shortTokenSchema,
};
