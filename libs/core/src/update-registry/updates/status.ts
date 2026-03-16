import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_STATUS: UpdateDefinition = {
  update_type: UPDATE_TYPES.STATUS,
  value_kind: 'json',
  cardinality: 'single',
  schema: z.object({
    title: z.string().min(1),
    link: z.string().min(1),
  }),
};
