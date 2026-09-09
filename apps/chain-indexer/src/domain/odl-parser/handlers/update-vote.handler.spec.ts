import { EventEmitter2 } from '@nestjs/event-emitter';
import { UPDATE_TYPES } from '@opden-data-layer/core';

import { NotificationEmitterService } from '../../notification-adapter/notification-emitter.service';
import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner } from '../guards';
import { UpdateVoteHandler } from './update-vote.handler';

describe('UpdateVoteHandler posting auth', () => {
  const ctx: OdlEventContext = {
    action: 'update_vote',
    creator: 'bob',
    blockNum: 10,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'trx-vote',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map(),
  };

  const votedUpdate = {
    update_id: 'upd-1',
    object_id: 'obj-1',
    update_type: UPDATE_TYPES.NAME,
  };

  const core = {
    object_id: 'obj-1',
    object_type: 'place',
    creator: 'owner',
  };

  it('TC-009: casts vote under posting auth when payload claims another voter', async () => {
    const findByUpdateIdAndVoter = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue(undefined);
    const notificationEmitter = {
      odlContext: jest.fn().mockReturnValue({}),
      emitWithContext: jest.fn(),
      emitTrxProcessedOdl: jest.fn(),
    } as unknown as NotificationEmitterService;

    const handler = new UpdateVoteHandler(
      {
        create,
        delete: jest.fn(),
        findByUpdateIdAndVoter,
        update: jest.fn(),
      } as unknown as import('../../../repositories').ValidityVotesRepository,
      {
        findByUpdateId: jest.fn().mockResolvedValue(votedUpdate),
      } as unknown as import('../../../repositories').ObjectUpdatesRepository,
      {
        findByObjectId: jest.fn().mockResolvedValue(core),
      } as unknown as import('../../../repositories').ObjectsCoreRepository,
      { check: jest.fn().mockReturnValue(null) } as unknown as WriteGuardRunner,
      { emit: jest.fn() } as unknown as EventEmitter2,
      notificationEmitter,
    );

    await handler.handle(
      {
        update_id: 'upd-1',
        voter: 'alice',
        vote: 'for',
      },
      ctx,
    );

    expect(findByUpdateIdAndVoter).toHaveBeenCalledWith('upd-1', 'bob');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ voter: 'bob', vote: 'for' }),
    );
    expect(findByUpdateIdAndVoter).not.toHaveBeenCalledWith('upd-1', 'alice');
    expect(create).not.toHaveBeenCalledWith(
      expect.objectContaining({ voter: 'alice' }),
    );
  });
});
