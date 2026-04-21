import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SALE_EVENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.SALE_EVENT,
  description: 'Sale or discount configuration.',
  namespace: 'schema',
  localizable: true,
  semantic_key: 'SaleEvent',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    value: z.string().min(1),
    start_date: z.number().int().positive().optional(),
    end_date: z.number().int().positive().optional(),
  }),
};
