import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_SIMILAR: UpdateDefinition = {
  update_type: UPDATE_TYPES.SIMILAR,
  description: 'Similar or related object reference.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
