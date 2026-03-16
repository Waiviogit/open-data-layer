import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_RELATED: UpdateDefinition = {
  update_type: UPDATE_TYPES.RELATED,
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
