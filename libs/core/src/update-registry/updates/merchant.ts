import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MERCHANT: UpdateDefinition = {
  update_type: UPDATE_TYPES.MERCHANT,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    name: z.string().min(1),
    author_permlink: z.string().optional(),
  }),
};
