import { EventEmitter2 } from '@nestjs/event-emitter';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner } from '../guards';
import { UpdateVoteHandler } from './update-vote.handler';

describe('UpdateVoteHandler create_odl_event_index', () => {
  const hiveTrxId = 'hive-trx-abc';

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

  it('resolves update_id from create_odl_event_index and records a for vote', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const findByUpdateId = jest.fn().mockResolvedValue(votedUpdate);
    const handler = new UpdateVoteHandler(
      { create, delete: jest.fn() } as unknown as import('../../../repositories').ValidityVotesRepository,
      { findByUpdateId } as unknown as import('../../../repositories').ObjectUpdatesRepository,
      {
        findByObjectId: jest.fn().mockResolvedValue(core),
      } as unknown as import('../../../repositories').ObjectsCoreRepository,
      { check: jest.fn().mockReturnValue(null) } as unknown as WriteGuardRunner,
      new EventEmitter2(),
    );

    await handler.handle(
      {
        create_odl_event_index: createCtx.odlEventIndex,
        object_id: 'obj-1',
        voter: 'alice',
        vote: 'for',
        transaction_id: 'vote-client-id',
      },
      voteCtx,
    );

    expect(findByUpdateId).toHaveBeenCalledWith(expectedUpdateId);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        update_id: expectedUpdateId,
        voter: 'alice',
        vote: 'for',
      }),
    );
  });
});
