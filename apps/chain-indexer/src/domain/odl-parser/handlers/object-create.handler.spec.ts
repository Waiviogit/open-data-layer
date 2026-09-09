import { EventEmitter2 } from '@nestjs/event-emitter';
import { OBJECT_TYPES } from '@opden-data-layer/core';
import { ObjectCreateHandler } from './object-create.handler';
import type { OdlEventContext } from '../odl-action-handler';

describe('ObjectCreateHandler', () => {
  const ctx: OdlEventContext = {
    action: 'object_create',
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

  it('skips when object_id already exists', async () => {
    const create = jest.fn();
    const findByObjectId = jest.fn().mockResolvedValue({
      object_id: 'pgx-recipe',
      object_type: OBJECT_TYPES.RECIPE,
      creator: 'alice',
    });
    const handler = new ObjectCreateHandler(
      { findByObjectId, create } as never,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );

    await handler.handle(
      {
        object_id: 'pgx-recipe',
        object_type: OBJECT_TYPES.RECIPE,
        creator: 'alice',
      },
      ctx,
    );

    expect(create).not.toHaveBeenCalled();
  });

  it('attributes a new object to posting auth when payload claims another creator', async () => {
    const create = jest.fn();
    const findByObjectId = jest.fn().mockResolvedValue(null);
    const emit = jest.fn();
    const handler = new ObjectCreateHandler(
      { findByObjectId, create } as never,
      { emit } as unknown as EventEmitter2,
    );

    await handler.handle(
      {
        object_id: 'pgx-new',
        object_type: OBJECT_TYPES.RECIPE,
        creator: 'alice',
      },
      { ...ctx, creator: 'bob' },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ creator: 'bob' }),
    );
  });
});
