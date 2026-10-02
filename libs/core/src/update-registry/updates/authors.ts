import type { UpdateDefinition } from '../types';
import { hiveAccountNameSchema } from '../schemas/string-schemas';
import { UPDATE_TYPES } from '../update-types';

/** Governance: activity author allowlist; applied only when a read request sends authors_only. @see docs/spec/governance-resolution.md §2, §14 */
export const UPDATE_AUTHORS: UpdateDefinition = {
  update_type: UPDATE_TYPES.AUTHORS,
  semantic_key: 'authors',
  namespace: 'odl',
  localizable: false,
  description: 'Governance: Hive accounts allowed when filtering object activity by authors.',
  value_kind: 'user_ref',
  cardinality: 'multi',
  schema: hiveAccountNameSchema,
};
