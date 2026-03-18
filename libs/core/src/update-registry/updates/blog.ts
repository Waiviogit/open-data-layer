import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BLOG: UpdateDefinition = {
  update_type: UPDATE_TYPES.BLOG,
  description: 'Blog or feed reference list.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    title: z.string().min(1),
    value: z.string().min(1),
  }),
};
