import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPES } from '@opden-data-layer/core';

import { UpdateCreateHandler } from './update-create.handler';
import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner, GovernanceWriteGuard } from '../guards';
import {
  defaultUpdateCreateUserRefDeps,
  defaultUpdateCreateValidityVotesDeps,
  mockObjectsCore,
} from './update-create.handler.spec-helpers';
import { defaultNotificationEmitter } from './update-create.handler.spec-helpers';

describe('UpdateCreateHandler json payloads', () => {
  const baseCtx: OdlEventContext = {
    action: 'update_create',
    creator: 'alice',
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx1',
    timestamp: new Date().toISOString(),
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map(),
  };

  const recipeCore = mockObjectsCore({
    object_id: 'pgx-bowl',
    object_type: OBJECT_TYPES.RECIPE,
    creator: 'alice',
    weight: null,
    meta_group_id: null,
    canonical: null,
    canonical_creator: null,
    transaction_id: 'tx0',
    status: 'active',
    seq: 0,
  });

  it('persists ingredients when value_json is newline-separated text', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      create,
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(recipeCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      defaultUpdateCreateValidityVotesDeps().validityVotesRepository,
      eventEmitter,
      defaultNotificationEmitter(),
    );

    await handler.handle(
      {
        object_id: 'pgx-bowl',
        update_type: 'ingredients',
        creator: 'alice',
        value_json: 'chicken\nrice\n',
      },
      baseCtx,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        update_type: 'ingredients',
        value_json: ['chicken', 'rice'],
      }),
    );
  });
});
