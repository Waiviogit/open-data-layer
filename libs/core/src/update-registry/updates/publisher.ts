import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';
import { OBJECT_TYPES } from '../../object-type-registry/object-types';

export const UPDATE_PUBLISHER: UpdateDefinition = {
  update_type: UPDATE_TYPES.PUBLISHER,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'publisher',
  description: 'Publisher or imprint details.',
  value_kind: 'object_ref',
  cardinality: 'single',
  applies_to: [OBJECT_TYPES.BUSINESS],
  schema: z.string().min(3).max(256),
};
