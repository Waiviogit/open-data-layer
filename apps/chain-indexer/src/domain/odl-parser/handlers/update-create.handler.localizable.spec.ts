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
      test_non_local: {
        update_type: 'test_non_local',
        description: 'test non-localizable',
        value_kind: 'text' as const,
        cardinality: 'single' as const,
        localizable: false,
        schema: z.string().min(1),
      },
    },
    OBJECT_TYPE_REGISTRY: {
      ...actual.OBJECT_TYPE_REGISTRY,
      [actual.OBJECT_TYPES.GOVERNANCE]: {
        ...gov,
        supported_updates: [...gov.supported_updates, 'test_non_local'],
      },
    },
  };
});

import { UpdateCreateHandler } from './update-create.handler';

describe('UpdateCreateHandler localizable', () => {
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

  it('stores locale null when update type is not localizable but payload has locale', async () => {
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue: jest.fn().mockResolvedValue(false),
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockResolvedValue(governanceCore),
    } as unknown as import('../../../repositories').ObjectsCoreRepository;
    const runner = new WriteGuardRunner([]);
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
        update_type: 'test_non_local',
        creator: 'owner',
        transaction_id: 'tx1',
        locale: 'fr-FR',
        value_text: 'value',
      },
      baseCtx,
    );

    expect(createReplacingIfPresent).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ locale: null }),
    );
  });
});
