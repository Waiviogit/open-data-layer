import type { UpdateDefinition } from '../types';
import { urlStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_URL: UpdateDefinition = {
  update_type: UPDATE_TYPES.URL,
  semantic_key: 'url',
  namespace: 'schema',
  localizable: true,
  description: 'URL or web link.',
  value_kind: 'text',
  cardinality: 'single',
  schema: urlStringSchema,
};
