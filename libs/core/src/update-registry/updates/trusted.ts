import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: account responsible for curation on objects they have authority over; lower precedence than admins. @see docs/spec/governance-resolution.md §2 */
export const UPDATE_TRUSTED: UpdateDefinition = {
  update_type: UPDATE_TYPES.TRUSTED,
  semantic_key: 'trusted',
  namespace: 'odl',
  localizable: false,
  description: 'Governance: trusted account list.',
  value_kind: 'user_ref',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
