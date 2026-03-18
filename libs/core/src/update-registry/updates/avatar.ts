import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AVATAR: UpdateDefinition = {
  update_type: UPDATE_TYPES.AVATAR,
  description: 'Avatar or profile image URL.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().url(),
};
