import type { UpdateDefinition } from '../types';
import { titleSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TITLE: UpdateDefinition = {
  update_type: UPDATE_TYPES.TITLE,
  semantic_key: 'title',
  namespace: 'schema',
  localizable: true,
  description: 'Display title.',
  value_kind: 'text',
  cardinality: 'single',
  schema: titleSchema,
};
