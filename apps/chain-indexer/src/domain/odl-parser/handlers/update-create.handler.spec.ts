import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import type { ObjectsCore } from '@opden-data-layer/core';
import { UpdateCreateHandler } from './update-create.handler';
import type { OdlEventContext } from '../odl-action-handler';
import { GovernanceWriteGuard, WriteGuardRunner } from '../guards';

describe('UpdateCreateHandler write guard', () => {
  const baseCtx: OdlEventContext = {
    action: 'update_create',
    creator: 'intruder',
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx1',
    timestamp: new Date().toISOString(),
    eventSeq: BigInt(1),
  };

  const governanceCore: ObjectsCore = {
    object_id: 'gov1',
    object_type: OBJECT_TYPES.GOVERNANCE,
    creator: 'owner',
    weight: null,
    meta_group_id: null,
    canonical: null,
    transaction_id: 'tx0',
    seq: 0,
  };

  it('does not persist when governance guard rejects signer', async () => {
    const create = jest.fn();
    const objectUpdatesRepository = { create } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      runner,
      eventEmitter,
    );

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        transaction_id: 'tx1',
        value_text: 'Title',
      },
      baseCtx,
    );

    expect(create).not.toHaveBeenCalled();
  });

  it('persists when signer matches governance object creator', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      create,
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      runner,
      eventEmitter,
    );

    const ctx = { ...baseCtx, creator: 'owner' };

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        transaction_id: 'tx1',
        value_text: 'Title',
      },
      ctx,
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalled();
  });
});
