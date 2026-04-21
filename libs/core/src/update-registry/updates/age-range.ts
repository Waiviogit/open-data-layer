import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AGE_RANGE: UpdateDefinition = {
  update_type: UPDATE_TYPES.AGE_RANGE,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'typicalAgeRange',
  description: 'Target age range or rating.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
