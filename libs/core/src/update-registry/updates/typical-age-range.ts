import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TYPICAL_AGE_RANGE: UpdateDefinition = {
  update_type: UPDATE_TYPES.TYPICAL_AGE_RANGE,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'typicalAgeRange',
  description: 'Target age range or rating.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
