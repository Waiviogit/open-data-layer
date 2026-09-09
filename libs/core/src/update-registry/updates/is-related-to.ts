import type { UpdateDefinition } from '../types';
import { objectIdSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_IS_RELATED_TO: UpdateDefinition = {
  update_type: UPDATE_TYPES.IS_RELATED_TO,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'isRelatedTo',
  description: 'Related object or item reference.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: objectIdSchema,
};
