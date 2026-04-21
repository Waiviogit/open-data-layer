import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_REMOVE: UpdateDefinition = {
  update_type: UPDATE_TYPES.REMOVE,
  namespace: 'odl',
  localizable: false,
  description: 'Soft-remove or hide reference.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
