import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

const GOVERNANCE_SCOPE = [
  'admins',
  'trusted',
  'moderators',
  'validity_cutoff',
  'restricted',
  'whitelist',
  'authorities',
  'banned',
  'muted',
] as const;

/** Governance: merge specific fields from the referenced governance object (one level only). @see spec/governance-resolution.md §2 */
export const UPDATE_INHERITS_FROM: UpdateDefinition = {
  update_type: UPDATE_TYPES.INHERITS_FROM,
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    object_id: z.string().min(1),
    scope: z.array(z.enum(GOVERNANCE_SCOPE)),
  }),
};
