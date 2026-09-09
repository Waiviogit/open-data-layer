import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account protected from appearing in the resolved muted set. @see docs/spec/governance-resolution.md §2 */
export const UPDATE_WHITELIST: UpdateDefinition = {
  update_type: UPDATE_TYPES.WHITELIST,
  namespace: 'odl',
  localizable: false,
  description: 'Governance: account protected from muted set.',
  value_kind: 'user_ref',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
