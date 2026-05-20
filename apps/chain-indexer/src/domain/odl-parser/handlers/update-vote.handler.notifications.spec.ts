import { EventEmitter2 } from '@nestjs/event-emitter';
import type { NewValidityVote } from '@opden-data-layer/core';
import { UPDATE_TYPES } from '@opden-data-layer/core';
import {
  TRX_PROCESSED_NOTIFICATION_EVENT,
  TrxProcessedNotificationPayload,
  VOTE_CAST_NOTIFICATION_EVENT,
  VoteCastNotificationPayload,
} from '../../notification-adapter/events/notification-domain-events';
import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner } from '../guards';
import { UpdateVoteHandler } from './update-vote.handler';

describe('UpdateVoteHandler notifications', () => {
  const ctx: OdlEventContext = {
    action: 'update_vote',
    creator: 'voter',
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

  function buildHandler(eventEmitter: EventEmitter2): UpdateVoteHandler {
    return new UpdateVoteHandler(
      {
        create: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        findByUpdateIdAndVoter: jest.fn().mockResolvedValue(undefined),
        update: jest.fn(),
      } as unknown as import('../../../repositories').ValidityVotesRepository,
      {
        findByUpdateId: jest.fn().mockResolvedValue(votedUpdate),
      } as unknown as import('../../../repositories').ObjectUpdatesRepository,
      {
        findByObjectId: jest.fn().mockResolvedValue(core),
      } as unknown as import('../../../repositories').ObjectsCoreRepository,
      { check: jest.fn().mockReturnValue(null) } as unknown as WriteGuardRunner,
      eventEmitter,
    );
  }

  it('emits vote cast and trx processed after creating a vote', async () => {
    const emit = jest.fn();
    const eventEmitter = { emit } as unknown as EventEmitter2;
    const handler = buildHandler(eventEmitter);

    await handler.handle(
      {
        update_id: 'upd-1',
        voter: 'voter',
        vote: 'for',
      },
      ctx,
    );

    expect(emit).toHaveBeenCalledWith(
      VOTE_CAST_NOTIFICATION_EVENT,
      expect.any(VoteCastNotificationPayload),
    );
    expect(emit).toHaveBeenCalledWith(
      TRX_PROCESSED_NOTIFICATION_EVENT,
      expect.any(TrxProcessedNotificationPayload),
    );
  });

  it('emits trx processed but not vote cast on vote remove', async () => {
    const emit = jest.fn();
    const eventEmitter = { emit } as unknown as EventEmitter2;
    const handler = buildHandler(eventEmitter);

    await handler.handle(
      {
        update_id: 'upd-1',
        voter: 'voter',
        vote: 'remove',
      },
      ctx,
    );

    const voteCastCalls = emit.mock.calls.filter(
      ([event]) => event === VOTE_CAST_NOTIFICATION_EVENT,
    );
    expect(voteCastCalls).toHaveLength(0);
    expect(emit).toHaveBeenCalledWith(
      TRX_PROCESSED_NOTIFICATION_EVENT,
      expect.any(TrxProcessedNotificationPayload),
    );
  });
});
