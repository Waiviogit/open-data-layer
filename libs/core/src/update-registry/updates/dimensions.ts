import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

const DIMENSION_UNITS = ['km', 'm', 'cm', 'mm', 'μm', 'mi', 'yd', 'ft', 'in', 'nmi'] as const;

export const UPDATE_DIMENSIONS: UpdateDefinition = {
  update_type: UPDATE_TYPES.DIMENSIONS,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    depth: z.number().min(0),
    unit: z.enum(DIMENSION_UNITS),
  }),
};
