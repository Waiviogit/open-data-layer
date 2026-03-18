import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PAGE_CONTENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.PAGE_CONTENT,
  description: 'Page body or main content.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
