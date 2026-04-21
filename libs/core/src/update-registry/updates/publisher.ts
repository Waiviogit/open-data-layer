import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PUBLISHER: UpdateDefinition = {
  update_type: UPDATE_TYPES.PUBLISHER,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'publisher',
  description: 'Publisher or imprint details.',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: z.string().min(3).max(256),
};
