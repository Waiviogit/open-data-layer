export const ADMINISTRATIVE_AUTHORITY_CHANGED_EVENT =
  'odl.authority.administrative_changed';

/** Emitted when `object_authority` gains or loses an `administrative` row for `account`. */
export class AdministrativeAuthorityChangedEvent {
  constructor(public readonly account: string) {}
}
