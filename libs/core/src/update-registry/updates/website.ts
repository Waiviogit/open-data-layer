import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_WEBSITE: UpdateDefinition = {
  update_type: UPDATE_TYPES.WEBSITE,
  description: 'Website or main URL.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    title: z.string().min(1),
    link: z.string().min(1),
  }),
};
