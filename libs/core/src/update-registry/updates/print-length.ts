import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PRINT_LENGTH: UpdateDefinition = {
  update_type: UPDATE_TYPES.PRINT_LENGTH,
  description: 'Print or page length.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().regex(/^\d+$/, 'Must be a numeric string'),
};
