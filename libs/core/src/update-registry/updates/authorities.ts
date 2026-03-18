import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: restricts object search scope to objects where this account holds object_authority. @see spec/governance-resolution.md §2 */
export const UPDATE_AUTHORITIES: UpdateDefinition = {
  update_type: UPDATE_TYPES.AUTHORITIES,
  description: 'Governance: authority or scope list.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
