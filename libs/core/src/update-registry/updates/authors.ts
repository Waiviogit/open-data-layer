import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_AUTHORS: UpdateDefinition = {
  update_type: UPDATE_TYPES.AUTHORS,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'author',
  description: 'Authors or contributors list.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: z.string().min(3).max(256),
};
