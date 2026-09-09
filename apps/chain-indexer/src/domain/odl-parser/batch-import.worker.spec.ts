import { Readable } from 'node:stream';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ConfigService } from '@nestjs/config';
import type { IpfsClient } from '@opden-data-layer/clients';

import type { NotificationEmitterService } from '../notification-adapter/notification-emitter.service';
import type { OdlActionHandler, OdlEventContext } from './odl-action-handler';
import { BatchImportWorker } from './batch-import.worker';
import {
  BATCH_IMPORT_MAX_BYTES,
  BATCH_IMPORT_MAX_EVENTS,
} from '../../constants/batch-import.constants';

jest.mock('../../constants/batch-import.constants', () => ({
  BATCH_IMPORT_MAX_EVENTS: 5,
  BATCH_IMPORT_MAX_BYTES: 4096,
}));

function noopHandler(action: string, handle = jest.fn().mockResolvedValue(undefined)): OdlActionHandler {
  return { action, handle };
}

function buildWorker(deps: {
  ipfsClient: IpfsClient;
  notificationEmitter: NotificationEmitterService;
  updateCreateHandler?: OdlActionHandler;
  maxRetries?: number;
}): BatchImportWorker {
  const updateCreate =
    deps.updateCreateHandler ?? noopHandler('update_create');
  const handlers = [
    noopHandler('object_create'),
    updateCreate,
    noopHandler('update_vote'),
    noopHandler('rank_vote'),
    noopHandler('favorite'),
    noopHandler('ownership'),
    noopHandler('update_user_metadata'),
    noopHandler('channel_create'),
    noopHandler('channel_alias_register'),
    noopHandler('channel_member_add'),
    noopHandler('channel_member_remove'),
    noopHandler('channel_leave'),
    noopHandler('channel_update'),
    noopHandler('message_create'),
    noopHandler('message_update'),
    noopHandler('message_delete'),
    noopHandler('message_context_exclude'),
    noopHandler('shop_deselect'),
  ];

  const config = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'batchImport.maxRetries') {
        return deps.maxRetries ?? 0;
      }
      if (key === 'batchImport.retryDelayMs') {
        return 1;
      }
      return defaultValue;
    }),
  } as unknown as ConfigService;

  return new BatchImportWorker(
    deps.ipfsClient,
    config,
    {} as EventEmitter2,
    deps.notificationEmitter,
    handlers[0]! as never,
    handlers[1]! as never,
    handlers[2]! as never,
    handlers[3]! as never,
    handlers[4]! as never,
    handlers[5]! as never,
    handlers[6]! as never,
    handlers[7]! as never,
    handlers[8]! as never,
    handlers[9]! as never,
    handlers[10]! as never,
    handlers[11]! as never,
    handlers[12]! as never,
    handlers[13]! as never,
    handlers[14]! as never,
    handlers[15]! as never,
    handlers[16]! as never,
    handlers[17]! as never,
  );
}

function updateCreateEvent(
  index: number,
  creator = 'alice',
): Record<string, unknown> {
  return {
    action: 'update_create',
    v: 1,
    payload: {
      object_id: `obj-${index}`,
      update_type: 'name',
      creator,
      value_text: `Title ${index}`,
    },
  };
}

function batchJson(events: unknown[]): string {
  return JSON.stringify({ events });
}

describe('BatchImportWorker', () => {
  const parentCtx: OdlEventContext = {
    action: 'batch_import',
    creator: 'bob',
    blockNum: 100,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'trx-batch',
    timestamp: '2026-01-01T00:00:00.000Z',
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map(),
  };

  function notificationEmitterMock(): NotificationEmitterService {
    return {
      odlContext: jest.fn().mockReturnValue({
        blockNum: parentCtx.blockNum,
        trxId: parentCtx.transactionId,
        occurredAt: parentCtx.timestamp,
      }),
      emitWithContext: jest.fn(),
    } as unknown as NotificationEmitterService;
  }

  it('TC-012: replays at most BATCH_IMPORT_MAX_EVENTS child events', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const updateCreateHandler = noopHandler('update_create', handle);
    const notificationEmitter = notificationEmitterMock();
    const events = Array.from({ length: BATCH_IMPORT_MAX_EVENTS + 5 }, (_, i) =>
      updateCreateEvent(i),
    );
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([batchJson(events)])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler,
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyCap' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(BATCH_IMPORT_MAX_EVENTS);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'batch_import_completed',
        actor: 'bob',
      }),
    );
  });

  it('TC-013: refuses completion when content exceeds byte cap', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const notificationEmitter = notificationEmitterMock();
    const padding = 'x'.repeat(BATCH_IMPORT_MAX_BYTES);
    const oversized = batchJson([updateCreateEvent(0, 'alice')]).replace(
      '"Title 0"',
      `"${padding}"`,
    );
    expect(Buffer.byteLength(oversized, 'utf8')).toBeGreaterThan(
      BATCH_IMPORT_MAX_BYTES,
    );

    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([oversized])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyBig' },
      ctx: parentCtx,
    });

    expect(handle).not.toHaveBeenCalled();
    expect(notificationEmitter.emitWithContext).not.toHaveBeenCalled();
  });

  it('TC-014: notifies signer once a batch file is fully replayed', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const notificationEmitter = notificationEmitterMock();
    const events = [updateCreateEvent(0), updateCreateEvent(1)];
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([batchJson(events)])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyTwo' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(2);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalledTimes(1);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: 'batch_import_completed',
        payload: { cid: 'bafyTwo' },
      }),
    );
  });

  it('TC-017: attributes child events to batch signer, not payload creator', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const updateCreateHandler = noopHandler('update_create', handle);
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(
        Readable.from([batchJson([updateCreateEvent(0, 'alice')])]),
      ),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter: notificationEmitterMock(),
      updateCreateHandler,
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyChild' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ creator: 'bob' }),
    );
  });

  it('TC-102: replays every event when count equals the cap', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const events = Array.from({ length: BATCH_IMPORT_MAX_EVENTS }, (_, i) =>
      updateCreateEvent(i),
    );
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([batchJson(events)])),
    } as unknown as IpfsClient;
    const notificationEmitter = notificationEmitterMock();

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyExact' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(BATCH_IMPORT_MAX_EVENTS);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalled();
  });

  it('TC-103: completes a batch whose content is exactly the byte cap', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const notificationEmitter = notificationEmitterMock();
    const base = batchJson([updateCreateEvent(0)]);
    const padLen = BATCH_IMPORT_MAX_BYTES - Buffer.byteLength(base, 'utf8');
    const padded = `${base.slice(0, -1)}${' '.repeat(padLen)}}`;
    expect(Buffer.byteLength(padded, 'utf8')).toBe(BATCH_IMPORT_MAX_BYTES);

    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([padded])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyBytes' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(1);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalled();
  });

  it('TC-104: gives up when batch file cannot be fetched', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const notificationEmitter = notificationEmitterMock();
    const ipfsClient = {
      cat: jest.fn().mockRejectedValue(new Error('not found')),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler: noopHandler('update_create', handle),
      maxRetries: 0,
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyMissing' },
      ctx: parentCtx,
    });

    expect(handle).not.toHaveBeenCalled();
    expect(notificationEmitter.emitWithContext).not.toHaveBeenCalled();
  });

  it('TC-105: continues replaying siblings after one child handler throws', async () => {
    const handle = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('child failed'))
      .mockResolvedValueOnce(undefined);
    const notificationEmitter = notificationEmitterMock();
    const events = [updateCreateEvent(0), updateCreateEvent(1), updateCreateEvent(2)];
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([batchJson(events)])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter,
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyPartial' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(3);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalled();
  });

  it('TC-106: ignores nested batch_import inside a batch file', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const events = [
      { action: 'batch_import', v: 1, payload: { type: 'ipfs', ref: 'bafyNested' } },
      updateCreateEvent(0),
    ];
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([batchJson(events)])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter: notificationEmitterMock(),
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyOuter' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('TC-107: skips unknown child action and keeps processing the rest', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const events = [
      { action: 'nope', v: 1, payload: {} },
      updateCreateEvent(0),
    ];
    const ipfsClient = {
      cat: jest.fn().mockResolvedValue(Readable.from([batchJson(events)])),
    } as unknown as IpfsClient;

    const worker = buildWorker({
      ipfsClient,
      notificationEmitter: notificationEmitterMock(),
      updateCreateHandler: noopHandler('update_create', handle),
    });

    await worker.handleBatchImport({
      payload: { type: 'ipfs', ref: 'bafyUnknown' },
      ctx: parentCtx,
    });

    expect(handle).toHaveBeenCalledTimes(1);
  });
});
