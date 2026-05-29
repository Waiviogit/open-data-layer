import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import type { ObjectsCore } from '@opden-data-layer/core';
import type { OdlEventContext } from '../odl-action-handler';
import { WriteGuardRunner } from '../guards';

jest.mock('@opden-data-layer/core', () => {
  const actual = jest.requireActual('@opden-data-layer/core') as typeof import('@opden-data-layer/core');
  const { z } = require('zod') as typeof import('zod');
  const gov = actual.OBJECT_TYPE_REGISTRY[actual.OBJECT_TYPES.GOVERNANCE];
  return {
    ...actual,
    UPDATE_REGISTRY: {
      ...actual.UPDATE_REGISTRY,
      test_user_ref: {
        update_type: 'test_user_ref',
        description: 'test user ref',
        value_kind: 'user_ref' as const,
        cardinality: 'multi' as const,
        schema: z.string().min(1),
      },
    },
    OBJECT_TYPE_REGISTRY: {
      ...actual.OBJECT_TYPE_REGISTRY,
      [actual.OBJECT_TYPES.GOVERNANCE]: {
        ...gov,
        supported_updates: [...gov.supported_updates, 'test_user_ref'],
      },
    },
  };
});

import { UpdateCreateHandler } from './update-create.handler';

describe('UpdateCreateHandler user_ref', () => {
  const baseCtx: OdlEventContext = {
    action: 'update_create',
    creator: 'owner',
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx1',
    timestamp: new Date().toISOString(),
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map(),
  };

  const governanceCore: ObjectsCore = {
    object_id: 'gov1',
    object_type: OBJECT_TYPES.GOVERNANCE,
    creator: 'owner',
    weight: null,
    meta_group_id: null,
    canonical: null,
    canonical_creator: null,
    transaction_id: 'tx0',
    status: 'active',
    seq: 0,
  };

  it('skips when user not in DB and not found on Hive', async () => {
    const createReplacingIfPresent = jest.fn();
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const findByName = jest.fn().mockResolvedValue(undefined);
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const getAccounts = jest.fn().mockResolvedValue([]);
    const accountsCurrentRepository = {
      findByName,
    } as unknown as import('../../../repositories').AccountsCurrentRepository;
    const accountSyncQueueRepository = {
      enqueue,
    } as unknown as import('../../../repositories').AccountSyncQueueRepository;
    const hiveClient = {
      getAccounts,
    } as unknown as import('@opden-data-layer/clients').HiveClient;
    const runner = new WriteGuardRunner([]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      accountsCurrentRepository,
      accountSyncQueueRepository,
      hiveClient,
      runner,
      eventEmitter,
    );

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'test_user_ref',
        creator: 'owner',
        value_text: 'ghostuser',
      },
      baseCtx,
    );

    expect(findByName).toHaveBeenCalledWith('ghostuser');
    expect(getAccounts).toHaveBeenCalledWith(['ghostuser']);
    expect(enqueue).not.toHaveBeenCalled();
    expect(createReplacingIfPresent).not.toHaveBeenCalled();
    expect(existsByObjectAndValue).not.toHaveBeenCalled();
  });

  it('persists and enqueues sync when user not in DB but found on Hive', async () => {
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const findByName = jest.fn().mockResolvedValue(undefined);
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const getAccounts = jest.fn().mockResolvedValue([{ name: 'alice' }]);
    const accountsCurrentRepository = {
      findByName,
    } as unknown as import('../../../repositories').AccountsCurrentRepository;
    const accountSyncQueueRepository = {
      enqueue,
    } as unknown as import('../../../repositories').AccountSyncQueueRepository;
    const hiveClient = {
      getAccounts,
    } as unknown as import('@opden-data-layer/clients').HiveClient;
    const runner = new WriteGuardRunner([]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      accountsCurrentRepository,
      accountSyncQueueRepository,
      hiveClient,
      runner,
      eventEmitter,
    );

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'test_user_ref',
        creator: 'owner',
        value_text: 'alice',
      },
      baseCtx,
    );

    expect(getAccounts).toHaveBeenCalledWith(['alice']);
    expect(enqueue).toHaveBeenCalledWith('alice', expect.any(Number));
    expect(existsByObjectAndValue).toHaveBeenCalledWith(
      'gov1',
      'test_user_ref',
      'user_ref',
      'alice',
    );
    expect(createReplacingIfPresent).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        value_text: 'alice',
        value_geo: null,
        value_json: null,
      }),
    );
  });

  it('persists when user already in DB without calling Hive', async () => {
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const findByName = jest.fn().mockResolvedValue({ name: 'bob' });
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const getAccounts = jest.fn();
    const accountsCurrentRepository = {
      findByName,
    } as unknown as import('../../../repositories').AccountsCurrentRepository;
    const accountSyncQueueRepository = {
      enqueue,
    } as unknown as import('../../../repositories').AccountSyncQueueRepository;
    const hiveClient = {
      getAccounts,
    } as unknown as import('@opden-data-layer/clients').HiveClient;
    const runner = new WriteGuardRunner([]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      accountsCurrentRepository,
      accountSyncQueueRepository,
      hiveClient,
      runner,
      eventEmitter,
    );

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'test_user_ref',
        creator: 'owner',
        value_text: 'bob',
      },
      baseCtx,
    );

    expect(findByName).toHaveBeenCalledWith('bob');
    expect(getAccounts).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
    expect(createReplacingIfPresent).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ value_text: 'bob' }),
    );
  });
});
