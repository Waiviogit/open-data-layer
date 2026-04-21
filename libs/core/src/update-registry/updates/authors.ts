import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';
import { OBJECT_TYPES } from '../../object-type-registry/object-types';

export const UPDATE_AUTHORS: UpdateDefinition = {
  update_type: UPDATE_TYPES.AUTHORS,
  namespace: 'schema',
  localizable: false,
  semantic_key: 'author',
  description: 'Authors or contributors list.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  applies_to: [OBJECT_TYPES.PERSON],
  schema: z.string().min(3).max(256),
};
