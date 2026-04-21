import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_EMAIL: UpdateDefinition = {
  update_type: UPDATE_TYPES.EMAIL,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'email',
  description: 'Email address or contact.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().email(),
};
