import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_TITLE: UpdateDefinition = {
  update_type: UPDATE_TYPES.TITLE,
  semantic_key: 'title',
  namespace: 'schema',
  localizable: true,
  description: 'Display title.',
  value_kind: 'text',
  cardinality: 'single',
  schema: z.string().min(1).max(256),
};
