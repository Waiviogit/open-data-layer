import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TELEPHONE: UpdateDefinition = {
  update_type: UPDATE_TYPES.TELEPHONE,
  semantic_key: 'telephone',
  namespace: 'schema',
  localizable: true,
  description: 'Phone number or contact.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
