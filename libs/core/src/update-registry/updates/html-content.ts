import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_HTML_CONTENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.HTML_CONTENT,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
