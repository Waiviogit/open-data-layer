import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

const WEIGHT_UNITS = ['t', 'kg', 'gm', 'mg', 'mcg', 'st', 'lb', 'oz'] as const;

export const UPDATE_PRODUCT_WEIGHT: UpdateDefinition = {
  update_type: UPDATE_TYPES.PRODUCT_WEIGHT,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    value: z.number().min(0),
    unit: z.enum(WEIGHT_UNITS),
  }),
};
