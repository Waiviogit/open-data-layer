import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BUTTON: UpdateDefinition = {
  update_type: UPDATE_TYPES.BUTTON,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    title: z.string().min(1),
    link: z.string().min(1),
  }),
};
