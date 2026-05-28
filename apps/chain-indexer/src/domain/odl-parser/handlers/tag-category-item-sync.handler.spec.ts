import { TagCategoryItemSyncHandler } from './tag-category-item-sync.handler';
import { ObjectStatusCreatedEvent } from '../object-status-created.event';
import { TagCategoryItemMutatedEvent } from '../tag-category-item-mutated.event';

describe('TagCategoryItemSyncHandler', () => {
  it('enqueues object on tag category item mutated', async () => {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const handler = new TagCategoryItemSyncHandler({ enqueue } as never);

    await handler.handleTagCategoryItemMutated(new TagCategoryItemMutatedEvent('o1'));

    expect(enqueue).toHaveBeenCalledWith('o1', expect.any(Number));
  });

  it('skips enqueue when objectId is empty', async () => {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const handler = new TagCategoryItemSyncHandler({ enqueue } as never);

    await handler.handleTagCategoryItemMutated(new TagCategoryItemMutatedEvent('  '));

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues object on status created', async () => {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const handler = new TagCategoryItemSyncHandler({ enqueue } as never);

    await handler.handleObjectStatusCreated(
      new ObjectStatusCreatedEvent('o2', 'admin', 'unavailable'),
    );

    expect(enqueue).toHaveBeenCalledWith('o2', expect.any(Number));
  });
});
