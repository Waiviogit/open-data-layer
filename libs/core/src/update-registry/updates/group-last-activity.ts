import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

export const UPDATE_GROUP_LAST_ACTIVITY: UpdateDefinition = {
  update_type: UPDATE_TYPES.GROUP_LAST_ACTIVITY,
  namespace: 'odl',
  localizable: false,
  description: 'Last activity timestamp for group.',
  value_kind: 'text',
  cardinality: 'single',
  /** Milliseconds to subtract from current date, e.g. "7776000000" (90 days). */
  schema: z.string().regex(/^\d+$/, 'Must be a numeric string in milliseconds'),
};
