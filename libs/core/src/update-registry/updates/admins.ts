import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account responsible for object data curation; highest precedence. @see docs/spec/governance-resolution.md §2 */
export const UPDATE_ADMINS: UpdateDefinition = {
  update_type: UPDATE_TYPES.ADMINS,
  semantic_key: 'admins',
  namespace: 'odl',
  localizable: false,
  description: 'Governance: accounts responsible for object data curation.',
  value_kind: 'user_ref',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
