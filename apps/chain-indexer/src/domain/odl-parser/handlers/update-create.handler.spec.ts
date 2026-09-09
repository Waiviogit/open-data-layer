import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import { ObjectsCore } from '@opden-data-layer/odl-db-types';

import { UpdateCreateHandler } from './update-create.handler';
import {
  defaultNotificationEmitter,
  defaultUpdateCreateUserRefDeps,
  defaultUpdateCreateValidityVotesDeps,
  mockObjectsCore,
} from './update-create.handler.spec-helpers';
import type { OdlEventContext } from '../odl-action-handler';
import { GovernanceWriteGuard, WriteGuardRunner } from '../guards';
import {
  OBJECT_STATUS_RECOMPUTE_EVENT,
  ObjectStatusRecomputeEvent,
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

  const governanceCore = mockObjectsCore({
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
  });

  const placeCore = mockObjectsCore({
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
  });

  it('does not persist when governance guard rejects signer', async () => {
    const create = jest.fn();
    const objectUpdatesRepository = {
      create,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      defaultNotificationEmitter(),
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

    expect(create).not.toHaveBeenCalled();
    expect(validityVotesDeps.validityVotesRepository.createIfAbsent).not.toHaveBeenCalled();
  });

  it('attributes update to posting auth when payload claims another creator', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      create,
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(placeCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    const emitWithContext = jest.fn();
    const notificationEmitter = {
      ...defaultNotificationEmitter(),
      emitWithContext,
    } as unknown as import('../../notification-adapter/notification-emitter.service').NotificationEmitterService;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      notificationEmitter,
    );

    await handler.handle(
      {
        object_id: 'place1',
        update_type: 'name',
        creator: 'alice',
        value_text: 'Title',
      },
      { ...baseCtx, creator: 'bob' },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ creator: 'bob' }),
    );
    expect(validityVotesDeps.validityVotesRepository.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ voter: 'bob' }),
    );
    expect(emitWithContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'object_update',
        actor: 'bob',
      }),
    );
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
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      defaultNotificationEmitter(),
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

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.any(Object));
    expect(validityVotesDeps.validityVotesRepository.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        object_id: 'gov1',
        voter: 'owner',
        vote: 'for',
        transaction_id: 'tx1',
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it('appends new single-cardinality row from same creator without delete', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      create,
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      defaultNotificationEmitter(),
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
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        object_id: 'gov1',
        update_type: 'name',
        creator: 'owner',
        value_text: 'New title',
      }),
    );
  });

  it('skips when duplicate value already exists on the object', async () => {
    const create = jest.fn();
    const objectUpdatesRepository = {
      create,
      existsByObjectAndValue: jest.fn().mockResolvedValue(true),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    const emitWithContext = jest.fn();
    const notificationEmitter = {
      ...defaultNotificationEmitter(),
      emitWithContext,
    } as unknown as import('../../notification-adapter/notification-emitter.service').NotificationEmitterService;
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      notificationEmitter,
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

    expect(create).not.toHaveBeenCalled();
    expect(validityVotesDeps.validityVotesRepository.createIfAbsent).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(emitWithContext).not.toHaveBeenCalled();
  });

  it('still emits events when createIfAbsent throws', async () => {
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
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    (validityVotesDeps.validityVotesRepository.createIfAbsent as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      defaultNotificationEmitter(),
    );

    const ctx = { ...baseCtx, creator: 'owner' };

    await expect(
      handler.handle(
        {
          object_id: 'gov1',
          update_type: 'name',
          creator: 'owner',
          value_text: 'Title',
        },
        ctx,
      ),
    ).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it('emits OBJECT_STATUS_RECOMPUTE_EVENT after persisting a status update', async () => {
      const create = jest.fn().mockResolvedValue(undefined);
      const objectUpdatesRepository = {
        create,
        existsByObjectAndValue: jest.fn().mockResolvedValue(false),
      } as unknown as import('../../../repositories').ObjectUpdatesRepository;
      const objectsCoreRepository = {
        findByObjectId: jest.fn().mockResolvedValue(placeCore),
      } as unknown as import('../../../repositories').ObjectsCoreRepository;
      const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
      const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
      const userRefDeps = defaultUpdateCreateUserRefDeps();
      const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
      const handler = new UpdateCreateHandler(
        objectUpdatesRepository,
        objectsCoreRepository,
        userRefDeps.accountsCurrentRepository,
        userRefDeps.accountSyncQueueRepository,
        userRefDeps.hiveClient,
        runner,
        validityVotesDeps.validityVotesRepository,
        eventEmitter,
      defaultNotificationEmitter(),
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

      expect(create).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OBJECT_STATUS_RECOMPUTE_EVENT,
        expect.objectContaining({
          objectId: 'place1',
        }),
      );
      const statusEmit = (eventEmitter.emit as jest.Mock).mock.calls.find(
        (c: unknown[]) => c[0] === OBJECT_STATUS_RECOMPUTE_EVENT,
      );
      expect(statusEmit?.[1]).toBeInstanceOf(ObjectStatusRecomputeEvent);
    });

  it('emits TAG_CATEGORY_ITEM_MUTATED_EVENT after persisting tagCategoryItem', async () => {
    const restaurantCore = mockObjectsCore({
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
    });
    const create = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      create,
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(restaurantCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([new GovernanceWriteGuard()]);
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const userRefDeps = defaultUpdateCreateUserRefDeps();
    const validityVotesDeps = defaultUpdateCreateValidityVotesDeps();
    const handler = new UpdateCreateHandler(
      objectUpdatesRepository,
      objectsCoreRepository,
      userRefDeps.accountsCurrentRepository,
      userRefDeps.accountSyncQueueRepository,
      userRefDeps.hiveClient,
      runner,
      validityVotesDeps.validityVotesRepository,
      eventEmitter,
      defaultNotificationEmitter(),
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

    expect(create).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      TAG_CATEGORY_ITEM_MUTATED_EVENT,
      expect.objectContaining({ objectId: 'rest1' }),
    );
  });
});
