import { z } from 'zod';
import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: actions by this account after timestamp (unix) are untrusted; historical work remains valid. @see docs/spec/governance-resolution.md §2, §5 */
export const UPDATE_VALIDITY_CUTOFF: UpdateDefinition = {
  update_type: UPDATE_TYPES.VALIDITY_CUTOFF,
  namespace: 'odl',
  localizable: false,
  description: 'Governance: validity or time cutoff for updates.',
  value_kind: 'json',
  cardinality: 'multi',
  schema: z.object({
    account: hiveAccountNameSchema,
    timestamp: z.number(),
  }),
};
