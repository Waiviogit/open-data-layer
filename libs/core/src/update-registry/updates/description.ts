import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_DESCRIPTION: UpdateDefinition = {
  update_type: UPDATE_TYPES.DESCRIPTION,
  semantic_key: 'description',
  namespace: 'schema',
  localizable: true,
  description: 'Free-form description text.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1),
};
