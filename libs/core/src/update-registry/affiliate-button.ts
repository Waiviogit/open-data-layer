import { z } from 'zod';
import type { UpdateDefinition } from './types';
import { UPDATE_TYPES } from './update-types';

export const UPDATE_AFFILIATE_BUTTON: UpdateDefinition = {
  update_type: UPDATE_TYPES.AFFILIATE_BUTTON,
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().url(),
};
