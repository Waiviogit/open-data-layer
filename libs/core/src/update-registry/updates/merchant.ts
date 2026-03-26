import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_MERCHANT: UpdateDefinition = {
  update_type: UPDATE_TYPES.MERCHANT,
  description: 'Merchant or seller reference.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    name: z.string().min(1),
    object_id: z.string().optional(),
  }),
};
