import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_LINK: UpdateDefinition = {
  update_type: UPDATE_TYPES.LINK,
  description: 'Link or URL with optional metadata.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    type: z.string().min(1),
    value: z.string().min(1),
  }),
};
