import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { objectIdArraySchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SORT_CUSTOM: UpdateDefinition = {
  update_type: UPDATE_TYPES.SORT_CUSTOM,
  namespace: 'odl',
  localizable: true,
  description: 'Custom sort order or ranking.',
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    include: objectIdArraySchema,
    exclude: objectIdArraySchema,
    sortType: z
      .enum(['custom', 'recency', 'reverse_recency', 'by-name-asc', 'by-name-desc'])
      .optional(),
  }),
};
