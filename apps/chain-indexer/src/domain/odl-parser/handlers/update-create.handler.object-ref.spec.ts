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
      test_object_ref: {
        update_type: 'test_object_ref',
        description: 'test object ref',
        value_kind: 'object_ref' as const,
        cardinality: 'single' as const,
        schema: z.string().min(1).max(256),
      },
    },
    OBJECT_TYPE_REGISTRY: {
      ...actual.OBJECT_TYPE_REGISTRY,
      [actual.OBJECT_TYPES.GOVERNANCE]: {
        ...gov,
        supported_updates: [...gov.supported_updates, 'test_object_ref'],
      },
    },
  };
});

import { UpdateCreateHandler } from './update-create.handler';

describe('UpdateCreateHandler object_ref', () => {
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

  const referencedObject: ObjectsCore = {
    ...governanceCore,
    object_id: 'ref-target',
  };

  it('skips when referenced object_id does not exist in objects_core', async () => {
    const createReplacingIfPresent = jest.fn();
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockImplementation((id: string) => {
        if (id === 'gov1') {
          return Promise.resolve(governanceCore);
        }
        return Promise.resolve(undefined);
      }),
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
        update_type: 'test_object_ref',
        creator: 'owner',
        transaction_id: 'tx1',
        value_text: 'missing-ref',
      },
      baseCtx,
    );

    expect(createReplacingIfPresent).not.toHaveBeenCalled();
    expect(existsByObjectAndValue).not.toHaveBeenCalled();
  });

  it('persists value_text and calls existsByObjectAndValue with object_ref when referenced object exists', async () => {
    const createReplacingIfPresent = jest.fn().mockResolvedValue(undefined);
    const existsByObjectAndValue = jest.fn().mockResolvedValue(false);
    const objectUpdatesRepository = {
      createReplacingIfPresent,
      findByObjectTypeAndCreator: jest.fn().mockResolvedValue(undefined),
      existsByObjectAndValue,
    } as unknown as import('../../../repositories').ObjectUpdatesRepository;
    const objectsCoreRepository = {
      findByObjectId: jest.fn().mockImplementation((id: string) => {
        if (id === 'gov1') {
          return Promise.resolve(governanceCore);
        }
        if (id === 'ref-target') {
          return Promise.resolve(referencedObject);
        }
        return Promise.resolve(undefined);
      }),
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
        update_type: 'test_object_ref',
        creator: 'owner',
        transaction_id: 'tx1',
        value_text: 'ref-target',
      },
      baseCtx,
    );

    expect(existsByObjectAndValue).toHaveBeenCalledWith(
      'gov1',
      'test_object_ref',
      'object_ref',
      'ref-target',
    );
    expect(createReplacingIfPresent).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        value_text: 'ref-target',
        value_geo: null,
        value_json: null,
      }),
    );
  });
});
