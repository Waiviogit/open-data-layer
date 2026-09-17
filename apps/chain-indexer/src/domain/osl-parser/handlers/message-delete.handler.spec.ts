import { blockTimestampToUnixSeconds } from '@opden-data-layer/core';

import { MessageDeleteHandler } from './message-delete.handler';
import type { MessagesRepository } from '../../../repositories/messages.repository';

describe('MessageDeleteHandler', () => {
  const baseCtx = {
    action: 'message_delete',
    creator: 'alice',
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-1',
    timestamp: '2024-01-15T12:01:40.000Z',
    eventSeq: BigInt(2),
    eventIdIndexMap: new Map<string, number>(),
  };

  const plainRow = {
    message_id: 'tx-0-0-0',
    channel_id: 'ch-1',
    author: 'alice',
    body: 'hello',
    dup_group_id: 'tx-0-0-0',
  };

  function makeHandler(overrides: Partial<MessagesRepository> = {}) {
    const messages = {
      tombstoneExists: jest.fn().mockResolvedValue(false),
      findById: jest.fn().mockResolvedValue(plainRow),
      deleteAndTombstone: jest.fn().mockResolvedValue(undefined),
      runInTransaction: jest.fn(async (fn: (trx: unknown) => Promise<void>) => fn({})),
      listClusterMembers: jest.fn().mockResolvedValue([]),
      repointDupGroup: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as MessagesRepository;

    return { handler: new MessageDeleteHandler(messages), messages };
  }

  it('author delete tombstones and removes row', async () => {
    const { handler, messages } = makeHandler();

    await handler.handle(
      { channel_id: 'ch-1', message_id: 'tx-0-0-0' },
      baseCtx,
    );

    expect(messages.deleteAndTombstone).toHaveBeenCalledWith(
      {
        message_id: 'tx-0-0-0',
        channel_id: 'ch-1',
        deleted_by: 'alice',
        deleted_at_unix: blockTimestampToUnixSeconds(baseCtx.timestamp),
        event_seq: BigInt(2),
        transaction_id: 'tx-1',
      },
      expect.anything(),
    );
  });

  it('skips when non-author deletes', async () => {
    const { handler, messages } = makeHandler();

    await handler.handle(
      { channel_id: 'ch-1', message_id: 'tx-0-0-0' },
      { ...baseCtx, creator: 'bob' },
    );

    expect(messages.deleteAndTombstone).not.toHaveBeenCalled();
  });

  it('is idempotent when tombstone already exists', async () => {
    const { handler, messages } = makeHandler({
      tombstoneExists: jest.fn().mockResolvedValue(true),
    });

    await handler.handle(
      { channel_id: 'ch-1', message_id: 'tx-0-0-0' },
      baseCtx,
    );

    expect(messages.deleteAndTombstone).not.toHaveBeenCalled();
    expect(messages.findById).not.toHaveBeenCalled();
  });

  it('skips when message is missing', async () => {
    const { handler, messages } = makeHandler({
      findById: jest.fn().mockResolvedValue(null),
    });

    await handler.handle(
      { channel_id: 'ch-1', message_id: 'tx-0-0-0' },
      baseCtx,
    );

    expect(messages.deleteAndTombstone).not.toHaveBeenCalled();
  });

  it('skips when message is in a different channel', async () => {
    const { handler, messages } = makeHandler({
      findById: jest.fn().mockResolvedValue({
        ...plainRow,
        channel_id: 'ch-1',
      }),
    });

    await handler.handle(
      { channel_id: 'ch-2', message_id: 'tx-0-0-0' },
      baseCtx,
    );

    expect(messages.deleteAndTombstone).not.toHaveBeenCalled();
  });

  it('TC-024: promotes successor when cluster root is deleted', async () => {
    const rootRow = {
      message_id: 'root-1',
      channel_id: 'ch-1',
      author: 'alice',
      body: 'hello',
      dup_group_id: 'root-1',
    };
    const { handler, messages } = makeHandler({
      findById: jest.fn().mockResolvedValue(rootRow),
      listClusterMembers: jest.fn().mockResolvedValue([
        { message_id: 'root-1', dup_group_id: 'root-1' },
        { message_id: 'member-2', dup_group_id: 'root-1' },
      ]),
    });

    await handler.handle(
      { channel_id: 'ch-1', message_id: 'root-1' },
      baseCtx,
    );

    expect(messages.deleteAndTombstone).toHaveBeenCalled();
    expect(messages.repointDupGroup).toHaveBeenCalledWith(
      'root-1',
      'member-2',
      expect.anything(),
    );
  });

  it('TC-025: skips promotion when deleted message is not cluster root', async () => {
    const memberRow = {
      message_id: 'member-2',
      channel_id: 'ch-1',
      author: 'alice',
      body: 'hello',
      dup_group_id: 'root-1',
    };
    const { handler, messages } = makeHandler({
      findById: jest.fn().mockResolvedValue(memberRow),
    });

    await handler.handle(
      { channel_id: 'ch-1', message_id: 'member-2' },
      baseCtx,
    );

    expect(messages.deleteAndTombstone).toHaveBeenCalled();
    expect(messages.listClusterMembers).not.toHaveBeenCalled();
    expect(messages.repointDupGroup).not.toHaveBeenCalled();
  });
});
