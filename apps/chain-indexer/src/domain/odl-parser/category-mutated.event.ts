export const CATEGORY_MUTATED_EVENT = 'odl.category.mutated';

export class CategoryMutatedEvent {
  constructor(public readonly objectId: string) {}
}
