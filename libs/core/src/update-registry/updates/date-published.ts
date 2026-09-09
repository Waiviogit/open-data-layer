import type { UpdateDefinition } from '../types';
import { dateStringSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_DATE_PUBLISHED: UpdateDefinition = {
  update_type: UPDATE_TYPES.DATE_PUBLISHED,
  description: 'Publication or release date.',
  namespace: 'schema',
  localizable: false,
  semantic_key: 'datePublished',
  value_kind: 'text',
  cardinality: 'single',
  schema: dateStringSchema,
};
