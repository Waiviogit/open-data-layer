export const GROUP_ID_MUTATED_EVENT = 'odl.group_id.mutated';

export class GroupIdMutatedEvent {
  constructor(public readonly objectId: string) {}
}
