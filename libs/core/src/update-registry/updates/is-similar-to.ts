import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IS_SIMILAR_TO: UpdateDefinition = {
  update_type: UPDATE_TYPES.IS_SIMILAR_TO,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'isSimilarTo',
  description: 'Similar or related object reference.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: objectIdSchema,
};
