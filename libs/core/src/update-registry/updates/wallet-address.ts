import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_WALLET_ADDRESS: UpdateDefinition = {
  update_type: UPDATE_TYPES.WALLET_ADDRESS,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    symbol: z.string().min(1),
    address: z.string().min(1),
    title: z.string().optional(),
  }),
};
