import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_COST: UpdateDefinition = {
  update_type: UPDATE_TYPES.COST,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
