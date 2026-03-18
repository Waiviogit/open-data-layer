import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PIN: UpdateDefinition = {
  update_type: UPDATE_TYPES.PIN,
  description: 'Pinned item or object reference.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
