/** Emitted after `user_metadata` shop visibility flags change. */
export const USER_METADATA_CHANGED_EVENT = 'user_metadata.changed';

export class UserMetadataChangedEvent {
  constructor(readonly account: string) {}
}
