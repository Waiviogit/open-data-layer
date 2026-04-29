/** Emitted when `object_authority` gains or loses `ownership` for `account`. */
export const OWNERSHIP_AUTHORITY_CHANGED_EVENT = 'ownership_authority.changed';

export class OwnershipAuthorityChangedEvent {
  constructor(readonly account: string) {}
}
