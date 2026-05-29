import { EventEmitter2 } from '@nestjs/event-emitter';

import { BatchImportHandler, BATCH_IMPORT_PROCESS_EVENT } from './batch-import.handler';
import type { OdlEventContext } from '../odl-action-handler';

describe('BatchImportHandler', () => {
  const ctx: OdlEventContext = {
    action: 'batch_import',
    creator: 'alice',
    blockNum: 100,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'trx-abc',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map(),
  };

  it('emits BATCH_IMPORT_PROCESS_EVENT with validated payload and ctx', async () => {
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new BatchImportHandler(emitter);

    await handler.handle({ type: 'ipfs', ref: 'bafyTest' }, ctx);

    expect(emitter.emit).toHaveBeenCalledWith(BATCH_IMPORT_PROCESS_EVENT, {
      payload: { type: 'ipfs', ref: 'bafyTest' },
      ctx,
    });
  });

  it('does not emit on invalid payload', async () => {
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const handler = new BatchImportHandler(emitter);

    await handler.handle({ type: 'http', ref: 'x' }, ctx);

    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
