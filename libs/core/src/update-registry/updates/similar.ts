import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SIMILAR: UpdateDefinition = {
  update_type: UPDATE_TYPES.SIMILAR,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'isSimilarTo',
  description: 'Similar or related object reference.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: z.string().min(3).max(256),
};
