import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AUTHORS: UpdateDefinition = {
  update_type: UPDATE_TYPES.AUTHORS,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    name: z.string().min(1),
    author_permlink: z.string().optional(),
  }),
};
