import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_RELATED: UpdateDefinition = {
  update_type: UPDATE_TYPES.RELATED,
  namespace: 'schema',
  localizable: true,
  semantic_key: 'isRelatedTo',
  description: 'Related object or item reference.',
  value_kind: 'object_ref',
  cardinality: 'multi',
  schema: z.string().min(3).max(256),
};
