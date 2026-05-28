export const TAG_CATEGORY_ITEM_MUTATED_EVENT = 'odl.tagCategoryItem.mutated';

export class TagCategoryItemMutatedEvent {
  constructor(public readonly objectId: string) {}
}
