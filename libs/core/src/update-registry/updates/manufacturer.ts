import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MANUFACTURER: UpdateDefinition = {
  update_type: UPDATE_TYPES.MANUFACTURER,
  description: 'Manufacturer or maker details.',
  namespace: 'schema',
  localizable: true,
  semantic_key: 'manufacturer',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: z.string().min(3).max(256),
};
