import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MANUFACTURER: UpdateDefinition = {
  update_type: UPDATE_TYPES.MANUFACTURER,
  description: 'Manufacturer or maker details.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    name: z.string().min(1),
    author_permlink: z.string().optional(),
  }),
};
