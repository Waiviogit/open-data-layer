import { UPDATE_TYPES } from '../../update-registry/update-types';
import { OBJECT_TYPES } from '../object-types';
import { ObjectTypeDefinition } from '../types';

/** Governance object: effective snapshot built from creator updates. @see spec/governance-resolution.md */
export const GOVERNANCE_OBJECT_TYPE: ObjectTypeDefinition = {
  object_type: OBJECT_TYPES.GOVERNANCE,
  description: 'Governance snapshot: admins, trusted, moderation, object control (see spec).',
  supported_updates: [
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.ADMINS,
    UPDATE_TYPES.TRUSTED,
    UPDATE_TYPES.MODERATORS,
    UPDATE_TYPES.AUTHORITIES,
    UPDATE_TYPES.RESTRICTED,
    UPDATE_TYPES.BANNED,
    UPDATE_TYPES.WHITELIST,
    UPDATE_TYPES.OBJECT_CONTROL,
    UPDATE_TYPES.INHERITS_FROM,
    UPDATE_TYPES.VALIDITY_CUTOFF,
  ],
  supposed_updates: [],
};
