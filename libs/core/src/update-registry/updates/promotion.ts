import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { labelSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PROMOTION: UpdateDefinition = {
  update_type: UPDATE_TYPES.PROMOTION,
  namespace: 'odl',
  localizable: true,
  description: 'Promotion or featured placement.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    value: labelSchema,
    start_date: z.number().int().positive().optional(),
    end_date: z.number().int().positive().optional(),
  }),
};
