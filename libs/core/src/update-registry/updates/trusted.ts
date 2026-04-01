import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account responsible for curation on objects they have authority over; lower precedence than admins. @see docs/spec/governance-resolution.md §2 */
export const UPDATE_TRUSTED: UpdateDefinition = {
  update_type: UPDATE_TYPES.TRUSTED,
  description: 'Governance: trusted account list.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
