import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CHART_ID: UpdateDefinition = {
  update_type: UPDATE_TYPES.CHART_ID,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
