import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import type { ObjectsCore } from '@opden-data-layer/core';
import { UpdateCreateHandler } from './update-create.handler';
import { defaultUpdateCreateUserRefDeps } from './update-create.handler.spec-helpers';
import type { OdlEventContext } from '../odl-action-handler';
import { GovernanceWriteGuard, WriteGuardRunner } from '../guards';
import {
  OBJECT_STATUS_CREATED_EVENT,
  ObjectStatusCreatedEvent,
} from '../object-status-created.event';
import { TAG_CATEGORY_ITEM_MUTATED_EVENT } from '../tag-category-item-mutated.event';

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

  const placeCore: ObjectsCore = {
    object_id: 'place1',
    object_type: OBJECT_TYPES.PLACE,
    creator: 'alice',
    weight: null,
    meta_group_id: null,
    canonical: null,
    canonical_creator: null,
    transaction_id: 'tx0',
    status: 'active',
    seq: 0,
  };

  it('does not persist when governance guard rejects signer', async () => {
    const createReplacingIfPresent = jest.fn();
    const objectUpdatesRepository = {
      createReplacingIfPresent,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
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
      eventEmitter,
    );

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        value_text: 'Title',
      },
      baseCtx,
    );

    expect(createReplacingIfPresent).not.toHaveBeenCalled();
  });

  it('persists when signer matches governance object creator', async () => {
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
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
      eventEmitter,
    );

    const ctx = { ...baseCtx, creator: 'owner' };

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        value_text: 'Title',
      },
      ctx,
    );

    expect(createReplacingIfPresent).toHaveBeenCalledTimes(1);
    expect(createReplacingIfPresent).toHaveBeenCalledWith(undefined, expect.any(Object));
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it('replaces existing single-cardinality row from same creator in one call', async () => {
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const findByObjectTypeAndCreator = jest.fn().mockResolvedValue({
      update_id: 'old-update-id',
      object_id: 'gov1',
      update_type: 'name',
      creator: 'owner',
    });
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator,
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
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
      eventEmitter,
    );

    const ctx = { ...baseCtx, creator: 'owner' };

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        value_text: 'New title',
      },
      ctx,
    );

    expect(existsByObjectAndValue).toHaveBeenCalled();
    expect(findByObjectTypeAndCreator).toHaveBeenCalledWith('gov1', 'name', 'owner');
    expect(createReplacingIfPresent).toHaveBeenCalledWith('old-update-id', expect.any(Object));
  });

  it('skips when duplicate value already exists on the object', async () => {
    const createReplacingIfPresent = jest.fn();
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue: jest.fn().mockResolvedValue(true),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
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
      eventEmitter,
    );

    const ctx = { ...baseCtx, creator: 'owner' };

    await handler.handle(
      {
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        value_text: 'Taken title',
      },
      ctx,
    );

    expect(createReplacingIfPresent).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('emits OBJECT_STATUS_CREATED_EVENT after persisting a status update', async () => {
      const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
      const objectUpdatesRepository = {
        createReplacingIfPresent,
        findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
        existsByObjectAndValue: jest.fn().mockResolvedValue(false),
      } as unknown as import('../../../repositories').ObjectUpdatesRepository;
      const objectsCoreRepository = {
        findByObjectId: jest.fn().mockResolvedValue(placeCore),
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
        eventEmitter,
      );

      const ctx: OdlEventContext = {
        ...baseCtx,
        creator: 'alice',
      };

      await handler.handle(
        {
          object_id: 'place1',
          update_type: 'status',
          creator: 'alice',
          value_json: { title: 'unavailable', link: 'https://example.com/s' },
        },
        ctx,
      );

      expect(createReplacingIfPresent).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OBJECT_STATUS_CREATED_EVENT,
        expect.objectContaining({
          objectId: 'place1',
          creator: 'alice',
          status: 'unavailable',
        }),
      );
      const statusEmit = (eventEmitter.emit as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === OBJECT_STATUS_CREATED_EVENT,
      );
      expect(statusEmit?.[1]).toBeInstanceOf(ObjectStatusCreatedEvent);
    });

  it('emits TAG_CATEGORY_ITEM_MUTATED_EVENT after persisting tagCategoryItem', async () => {
    const restaurantCore: ObjectsCore = {
      object_id: 'rest1',
      object_type: OBJECT_TYPES.RESTAURANT,
      creator: 'alice',
      weight: null,
      meta_group_id: null,
      canonical: null,
      canonical_creator: null,
      transaction_id: 'tx0',
      status: 'active',
      seq: 0,
    };
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(restaurantCore),
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
      eventEmitter,
    );

    await handler.handle(
      {
        object_id: 'rest1',
        update_type: 'tagCategoryItem',
        creator: 'alice',
        value_json: { category: 'Cuisine', value: 'Asian' },
      },
      { ...baseCtx, creator: 'alice' },
    );

    expect(createReplacingIfPresent).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      TAG_CATEGORY_ITEM_MUTATED_EVENT,
      expect.objectContaining({ objectId: 'rest1' }),
    );
  });
});
