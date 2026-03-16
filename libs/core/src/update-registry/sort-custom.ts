import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_SORT_CUSTOM: UpdateDefinition = {
  update_type: UPDATE_TYPES.SORT_CUSTOM,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    include: z.array(z.string()),
    exclude: z.array(z.string()),
  }),
};
