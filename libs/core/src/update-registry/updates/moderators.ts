import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account responsible for muting social content; their mutes form the resolved muted set. @see docs/spec/governance-resolution.md §2 */
export const UPDATE_MODERATORS: UpdateDefinition = {
  update_type: UPDATE_TYPES.MODERATORS,
  namespace: 'odl',
  localizable: false,
  description: 'Governance: moderator account list.',
  value_kind: 'text',
  cardinality: 'multi',
  schema: z.string().min(1),
};
