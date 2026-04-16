export const GOVERNANCE_OBJECT_MUTATED_EVENT = 'governance.object.mutated';

export class GovernanceObjectMutatedEvent {
  constructor(public readonly objectId: string) {}
}
