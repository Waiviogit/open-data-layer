import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: platform-level ban; content from this account excluded from resolved views. @see spec/governance-resolution.md §2 */
export const UPDATE_BANNED: UpdateDefinition = {
  update_type: UPDATE_TYPES.BANNED,
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
