import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: restricts object search scope to objects this account has favorited (`object_favorite`). @see docs/spec/governance-resolution.md §6 */
export const UPDATE_AUTHORITIES: UpdateDefinition = {
  update_type: UPDATE_TYPES.AUTHORITIES,
  namespace: 'odl',
  localizable: false,
  description: 'Governance: authority or scope list.',
  value_kind: 'user_ref',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
