import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PUBLISHER: UpdateDefinition = {
  update_type: UPDATE_TYPES.PUBLISHER,
  description: 'Publisher or imprint details.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    name: z.string().min(1),
    object_id: z.string().optional(),
  }),
};
