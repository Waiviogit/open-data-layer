import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: actions by this account after timestamp (unix) are untrusted; historical work remains valid. @see spec/governance-resolution.md §2, §5 */
export const UPDATE_VALIDITY_CUTOFF: UpdateDefinition = {
  update_type: UPDATE_TYPES.VALIDITY_CUTOFF,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    account: z.string().min(1),
    timestamp: z.number(),
  }),
};
