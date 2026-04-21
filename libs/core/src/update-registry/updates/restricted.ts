import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account flagged for reward eligibility (informational only in V2). @see docs/spec/governance-resolution.md §2 */
export const UPDATE_RESTRICTED: UpdateDefinition = {
  update_type: UPDATE_TYPES.RESTRICTED,
  namespace: 'odl',
  localizable: false,
  description: 'Governance: restricted account list.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
