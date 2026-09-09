import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: platform-level ban; content from this account excluded from resolved views. @see docs/spec/governance-resolution.md §2 */
export const UPDATE_BANNED: UpdateDefinition = {
  update_type: UPDATE_TYPES.BANNED,
  namespace: 'odl',
  localizable: false,
  description: 'Governance: platform-level ban; account excluded from resolved views.',
  value_kind: 'user_ref',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
