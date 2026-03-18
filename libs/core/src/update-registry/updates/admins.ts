import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account responsible for object data curation; highest precedence. @see spec/governance-resolution.md §2 */
export const UPDATE_ADMINS: UpdateDefinition = {
  update_type: UPDATE_TYPES.ADMINS,
  description: 'Governance: accounts responsible for object data curation.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
