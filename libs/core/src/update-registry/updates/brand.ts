import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BRAND: UpdateDefinition = {
  update_type: UPDATE_TYPES.BRAND,
  description: 'Brand or manufacturer reference.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    name: z.string().min(1),
    author_permlink: z.string().optional(),
  }),
};
