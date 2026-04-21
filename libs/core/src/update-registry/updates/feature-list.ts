import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_FEATURE_LIST: UpdateDefinition = {
  update_type: UPDATE_TYPES.FEATURE_LIST,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'featureList',
  description: 'Features or attributes list.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    key: z.string().min(1),
    value: z.string().min(1),
  }),
};
