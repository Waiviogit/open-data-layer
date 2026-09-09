import { EventEmitter2 } from '@nestjs/event-emitter';
import { UPDATE_TYPES } from '@opden-data-layer/core';

import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner } from '../guards';
import { RankVoteHandler } from './rank-vote.handler';

describe('RankVoteHandler posting auth', () => {
  const ctx: OdlEventContext = {
    action: 'rank_vote',
    creator: 'bob',
    blockNum: 10,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'trx-rank',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map(),
  };

  const votedUpdate = {
    update_id: 'upd-1',
    object_id: 'obj-1',
    update_type: UPDATE_TYPES.LINK,
  };

  const core = {
    object_id: 'obj-1',
    object_type: 'place',
    creator: 'owner',
  };

  it('TC-010: casts rank vote under posting auth when payload claims another voter', async () => {
    const findByUpdateIdVoterAndContext = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue(undefined);
    const recalculateForUpdateId = jest.fn().mockResolvedValue(undefined);

    const handler = new RankVoteHandler(
      {
        findByUpdateIdVoterAndContext,
        create,
        update: jest.fn(),
      } as unknown as import('../../../repositories').RankVotesRepository,
      {
        findByUpdateId: jest.fn().mockResolvedValue(votedUpdate),
      } as unknown as import('../../../repositories').ObjectUpdatesRepository,
      {
        findByObjectId: jest.fn().mockResolvedValue(core),
      } as unknown as import('../../../repositories').ObjectsCoreRepository,
      { check: jest.fn().mockReturnValue(null) } as unknown as WriteGuardRunner,
      { emit: jest.fn() } as unknown as EventEmitter2,
      { recalculateForUpdateId } as never,
    );

    await handler.handle(
      {
        object_id: 'obj-1',
        update_id: 'upd-1',
        voter: 'alice',
        rank: 5000,
        rank_context: 'default',
      },
      ctx,
    );

    expect(findByUpdateIdVoterAndContext).toHaveBeenCalledWith(
      'upd-1',
      'bob',
      'default',
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ voter: 'bob', rank: 5000 }),
    );
    expect(findByUpdateIdVoterAndContext).not.toHaveBeenCalledWith(
      'upd-1',
      'alice',
      expect.anything(),
    );
  });
});
