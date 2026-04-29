import { buildUserScopeKey } from '@opden-data-layer/core';
import { CategorySyncHandler } from './category-sync.handler';
import { CategoryMutatedEvent } from '../category-mutated.event';
import { AdministrativeAuthorityChangedEvent } from '../authority-changed.event';
import type { ObjectAuthority } from '@opden-data-layer/core';

describe('CategorySyncHandler', () => {
  it('enqueues object + global + user shop buckets + post authors on category mutated', async () => {
    const objectEnqueue = jest.fn().mockResolvedValue(undefined);
    const relatedEnqueue = jest.fn().mockResolvedValue(undefined);
    const findByObjectId = jest.fn(
      async (): Promise<ObjectAuthority[]> => [
        {
          object_id: 'o1',
          account: 'shop',
          authority_type: 'administrative',
        },
      ],
    );
    const findDistinctAuthorsByLinkedObject = jest.fn(async () => ['poster']);

    const handler = new CategorySyncHandler(
      {
        enqueue: objectEnqueue,
      } as never,
      {
        enqueue: relatedEnqueue,
      } as never,
      {
        findByObjectId,
      } as never,
      {
        findDistinctAuthorsByLinkedObject,
      } as never,
    );

    await handler.handleCategoryMutated(new CategoryMutatedEvent('o1'));

    expect(objectEnqueue).toHaveBeenCalledWith(
      'o1',
      expect.any(Number),
    );
    expect(relatedEnqueue).toHaveBeenCalledWith('global', '_', expect.any(Number));

    expect(relatedEnqueue).toHaveBeenCalledWith(
      'user',
      buildUserScopeKey('shop', ['book', 'product']),
      expect.any(Number),
    );
    expect(relatedEnqueue).toHaveBeenCalledWith(
      'user',
      buildUserScopeKey('shop', ['recipe']),
      expect.any(Number),
    );
    expect(relatedEnqueue).toHaveBeenCalledWith(
      'user',
      buildUserScopeKey('poster', ['book', 'product']),
      expect.any(Number),
    );
    expect(relatedEnqueue).toHaveBeenCalledWith(
      'user',
      buildUserScopeKey('poster', ['recipe']),
      expect.any(Number),
    );

    expect(findDistinctAuthorsByLinkedObject).toHaveBeenCalledWith('o1');
  });

  it('enqueues shop buckets on administrative authority change', async () => {
    const objectEnqueue = jest.fn();
    const relatedEnqueue = jest.fn().mockResolvedValue(undefined);
    const findByObjectId = jest.fn();
    const findDistinctAuthorsByLinkedObject = jest.fn();

    const handler = new CategorySyncHandler(
      { enqueue: objectEnqueue } as never,
      {
        enqueue: relatedEnqueue,
      } as never,
      { findByObjectId } as never,
      { findDistinctAuthorsByLinkedObject } as never,
    );

    await handler.handleAdministrativeAuthorityChanged(
      new AdministrativeAuthorityChangedEvent('merchant'),
    );

    expect(objectEnqueue).not.toHaveBeenCalled();
    expect(relatedEnqueue).toHaveBeenCalledTimes(2);
    expect(relatedEnqueue).toHaveBeenCalledWith(
      'user',
      buildUserScopeKey('merchant', ['book', 'product']),
      expect.any(Number),
    );
    expect(relatedEnqueue).toHaveBeenCalledWith(
      'user',
      buildUserScopeKey('merchant', ['recipe']),
      expect.any(Number),
    );
  });
});
