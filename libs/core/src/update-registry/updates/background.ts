import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_BACKGROUND: UpdateDefinition = {
  update_type: UPDATE_TYPES.BACKGROUND,
  description: 'Background image or cover URL.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().url(),
};
