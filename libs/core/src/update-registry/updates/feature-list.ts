import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { descriptionSchema, labelSchema } from '../schemas/string-schemas';
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
    key: labelSchema,
    value: descriptionSchema,
  }),
};
