import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_PARENT: UpdateDefinition = {
  update_type: UPDATE_TYPES.PARENT,
  namespace: 'odl',
  localizable: false,
  description: 'Parent object or list reference.',
  value_kind: 'object_ref',
  cardinality: 'single',
  schema: z.string().min(3).max(256),
};
