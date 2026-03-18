import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account protected from appearing in the resolved muted set. @see spec/governance-resolution.md §2 */
export const UPDATE_WHITELIST: UpdateDefinition = {
  update_type: UPDATE_TYPES.WHITELIST,
  description: 'Governance: account protected from muted set.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
