import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_CONTENT_VIEW: UpdateDefinition = {
  update_type: UPDATE_TYPES.CONTENT_VIEW,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
