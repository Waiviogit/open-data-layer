import { EventEmitter2 } from '@nestjs/event-emitter';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner } from '../guards';
import { TAG_CATEGORY_ITEM_MUTATED_EVENT } from '../tag-category-item-mutated.event';
import { UpdateVoteHandler } from './update-vote.handler';

describe('UpdateVoteHandler create_event_id', () => {
  const hiveTrxId = 'hive-trx-abc';
  const createEventId = '6d6c23b3-1ac4-4cbc-8ab0-9ba65d8c648d';

  const eventIdIndexMap = new Map<string, number>([[createEventId, 0]]);

  const createCtx: OdlEventContext = {
    action: 'update_create',
    creator: 'alice',
    blockNum: 10,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: hiveTrxId,
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(1),
    eventIdIndexMap,
  };

  const voteCtx: OdlEventContext = {
    ...createCtx,
    action: 'update_vote',
    creator: 'alice',
    odlEventIndex: 1,
    eventSeq: BigInt(2),
  };

  const expectedUpdateId = `${hiveTrxId}-0-0-0`;

  const votedUpdate = {
    update_id: expectedUpdateId,
    object_id: 'obj-1',
    update_type: UPDATE_TYPES.NAME,
  };

  const core = {
    object_id: 'obj-1',
    object_type: 'place',
    creator: 'owner',
  };

  it('resolves update_id from create_event_id and records a for vote', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const findByUpdateId = jest.fn().mockResolvedValue(votedUpdate);
    const handler = new UpdateVoteHandler(
      {
        create,
        delete: jest.fn(),
        findByUpdateIdAndVoter: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
      } as unknown as import('../../../repositories').ValidityVotesRepository,
      { findByUpdateId } as unknown as import('../../../repositories').ObjectUpdatesRepository,
      {
        findByObjectId: jest.fn().mockResolvedValue(core),
      } as unknown as import('../../../repositories').ObjectsCoreRepository,
      { check: jest.fn().mockReturnValue(null) } as unknown as WriteGuardRunner,
      new EventEmitter2(),
    );

    await handler.handle(
      {
        create_event_id: createEventId,
        object_id: 'obj-1',
        voter: 'alice',
        vote: 'for',
      },
      voteCtx,
    );

    expect(findByUpdateId).toHaveBeenCalledWith(expectedUpdateId);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        update_id: expectedUpdateId,
        voter: 'alice',
        vote: 'for',
        transaction_id: hiveTrxId,
      }),
    );
  });

  it('emits TAG_CATEGORY_ITEM_MUTATED_EVENT for tagCategoryItem votes', async () => {
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const votedUpdate = {
      update_id: expectedUpdateId,
      object_id: 'obj-1',
      update_type: UPDATE_TYPES.TAG_CATEGORY_ITEM,
    };
    const handler = new UpdateVoteHandler(
      {
        create: jest.fn(),
        delete: jest.fn(),
        findByUpdateIdAndVoter: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
      } as never,
      { findByUpdateId: jest.fn().mockResolvedValue(votedUpdate) } as never,
      { findByObjectId: jest.fn().mockResolvedValue(core) } as never,
      { check: jest.fn().mockReturnValue(null) } as never,
      eventEmitter,
    );

    await handler.handle(
      { update_id: expectedUpdateId, voter: 'alice', vote: 'for' },
      voteCtx,
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      TAG_CATEGORY_ITEM_MUTATED_EVENT,
      expect.objectContaining({ objectId: 'obj-1' }),
    );
  });
});
