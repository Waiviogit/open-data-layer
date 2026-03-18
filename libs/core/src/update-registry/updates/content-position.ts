import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CONTENT_POSITION: UpdateDefinition = {
  update_type: UPDATE_TYPES.CONTENT_POSITION,
  description: 'Content position or order.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
