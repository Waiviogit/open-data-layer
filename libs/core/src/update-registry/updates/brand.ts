import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BRAND: UpdateDefinition = {
  update_type: UPDATE_TYPES.BRAND,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'brand',
  description: 'Brand or manufacturer reference.',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: z.string().min(3).max(256),
};
