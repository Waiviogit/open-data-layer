import {
  CHANNEL_KINDS,
  computeActivityFingerprint,
  formatPHashHex,
} from '@opden-data-layer/core';
import { MessageCreateHandler } from './message-create.handler';
import type { ChannelsRepository } from '../../../repositories/channels.repository';
import type { MessagesRepository } from '../../../repositories/messages.repository';
import type { ObjectsCoreRepository } from '../../../repositories/objects-core.repository';
import type { NotificationEmitterService } from '../../notification-adapter/notification-emitter.service';

const LONG_CAPTION =
  'Our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening';

const OBJECT_CHANNEL = {
  channel_id: 'obj-ch-1',
  kind: CHANNEL_KINDS[2],
  object_id: 'obj-1',
  title: null,
  dissolved_at_unix: null,
};

describe('MessageCreateHandler notifications', () => {
  const baseCtx = {
    action: 'message_create',
    creator: 'alice',
    blockNum: 1,
    transactionIndex: 0,
    operationIndex: 0,
    odlEventIndex: 0,
    transactionId: 'tx-1',
    timestamp: '2024-01-15T12:00:00.000Z',
    eventSeq: BigInt(1),
    eventIdIndexMap: new Map<string, number>(),
  };

  function makeHandler(overrides: {
    channels?: Partial<ChannelsRepository>;
    messages?: Partial<MessagesRepository>;
    objectsCore?: Partial<ObjectsCoreRepository>;
    notificationEmitter?: Partial<NotificationEmitterService>;
  } = {}) {
    const channels = {
      findById: jest.fn(),
      isMember: jest.fn().mockResolvedValue(true),
      runInTransaction: jest.fn(async (fn: (trx: unknown) => Promise<void>) => fn({})),
      updateLastMessageAt: jest.fn().mockResolvedValue(undefined),
      ...overrides.channels,
    } as unknown as ChannelsRepository;

    const messages = {
      tombstoneExists: jest.fn().mockResolvedValue(false),
      findById: jest.fn().mockResolvedValue(null),
      insertMessage: jest.fn().mockResolvedValue(true),
      findBySource: jest.fn().mockResolvedValue(undefined),
      listDedupCandidates: jest.fn().mockResolvedValue([]),
      ...overrides.messages,
    } as unknown as MessagesRepository;

    const objectsCore = {
      findObjectTypesByIds: jest.fn().mockResolvedValue(new Map()),
      ...overrides.objectsCore,
    } as unknown as ObjectsCoreRepository;

    const notificationEmitter = {
      odlContext: jest.fn().mockReturnValue({
        blockNum: 1,
        trxId: 'tx-1',
        occurredAt: '2024-01-15T12:00:00.000Z',
      }),
      emitWithContext: jest.fn(),
      ...overrides.notificationEmitter,
    } as unknown as NotificationEmitterService;

    return {
      handler: new MessageCreateHandler(
        channels,
        messages,
        objectsCore,
        notificationEmitter,
      ),
      channels,
      messages,
      objectsCore,
      notificationEmitter,
    };
  }

  it('emits message_direct after commit for DM channels', async () => {
    const { handler, channels, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle({ channel_id: 'dm-1', body: 'hello' }, baseCtx);

    expect(notificationEmitter.emitWithContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'message_direct',
        actor: 'alice',
        payload: expect.objectContaining({
          channelId: 'dm-1',
          author: 'alice',
          encrypted: false,
        }),
      }),
    );
  });

  it('inserts create without reply_to with reply_to null', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle({ channel_id: 'dm-1', body: 'hello' }, baseCtx);

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reply_to: null }),
      expect.anything(),
    );
  });

  it('emits message_group with channel title after commit', async () => {
    const { handler, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'grp-1',
          kind: CHANNEL_KINDS[1],
          object_id: null,
          title: 'Team chat',
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle({ channel_id: 'grp-1', body: 'hello' }, baseCtx);

    expect(notificationEmitter.emitWithContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'message_group',
        payload: expect.objectContaining({
          channelTitle: 'Team chat',
          encrypted: false,
        }),
      }),
    );
  });

  it('skips encrypted object channel messages without emitting', async () => {
    const { handler, messages, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'obj-ch-1',
          kind: CHANNEL_KINDS[2],
          object_id: 'obj-1',
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle(
      {
        channel_id: 'obj-ch-1',
        encrypted_body: '#encrypted',
        encryption: { v: 1, mode: 'memo', to: 'bob' },
      },
      baseCtx,
    );

    expect(messages.insertMessage).not.toHaveBeenCalled();
    expect(notificationEmitter.emitWithContext).not.toHaveBeenCalled();
  });

  it('emits bell_object_message for plain object channel messages', async () => {
    const { handler, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'obj-ch-1',
          kind: CHANNEL_KINDS[2],
          object_id: 'obj-1',
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle({ channel_id: 'obj-ch-1', body: 'hello' }, baseCtx);

    expect(notificationEmitter.emitWithContext).toHaveBeenCalledTimes(1);
    expect(notificationEmitter.emitWithContext).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        type: 'bell_object_message',
        objectId: 'obj-1',
        payload: expect.objectContaining({
          encrypted: false,
        }),
      }),
    );
  });

  it('stores linked_object_ids on object channel when body mentions objects', async () => {
    const { handler, messages, objectsCore, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'obj-ch-rest',
          kind: CHANNEL_KINDS[2],
          object_id: 'rest-1',
          title: null,
          dissolved_at_unix: null,
        }),
      },
      objectsCore: {
        findObjectTypesByIds: jest.fn().mockResolvedValue(
          new Map([
            ['rest-1', 'restaurant'],
            ['dish-1', 'dish'],
          ]),
        ),
      },
    });

    await handler.handle(
      { channel_id: 'obj-ch-rest', body: 'try /object/dish-1 tonight' },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: 'obj-ch-rest',
        linked_object_ids: ['dish-1'],
      }),
      expect.anything(),
    );

    const emittedObjectIds = (
      notificationEmitter.emitWithContext as jest.Mock
    ).mock.calls.map((call) => call[1].objectId);
    expect(emittedObjectIds).toEqual(expect.arrayContaining(['rest-1', 'dish-1']));
  });

  it('stores empty linked_object_ids on DM even when body mentions objects', async () => {
    const { handler, messages, objectsCore } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
      objectsCore: {
        findObjectTypesByIds: jest.fn().mockResolvedValue(new Map([['dish-1', 'dish']])),
      },
    });

    await handler.handle(
      { channel_id: 'dm-1', body: 'see /object/dish-1' },
      baseCtx,
    );

    expect(objectsCore.findObjectTypesByIds).not.toHaveBeenCalled();
    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ linked_object_ids: [] }),
      expect.anything(),
    );
  });

  it('does not emit when channel is dissolved', async () => {
    const { handler, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: 999,
        }),
      },
    });

    await handler.handle({ channel_id: 'dm-1', body: 'hello' }, baseCtx);

    expect(notificationEmitter.emitWithContext).not.toHaveBeenCalled();
  });

  it('does not emit when message already exists', async () => {
    const { handler, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
      messages: {
        findById: jest.fn().mockResolvedValue({ message_id: 'existing' }),
      },
    });

    await handler.handle({ channel_id: 'dm-1', body: 'hello' }, baseCtx);

    expect(notificationEmitter.emitWithContext).not.toHaveBeenCalled();
  });

  it('stores original_created_at_unix on object channel when in range', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'obj-ch-1',
          kind: CHANNEL_KINDS[2],
          object_id: 'obj-1',
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle(
      {
        channel_id: 'obj-ch-1',
        body: 'archived',
        original_created_at_unix: 1_262_304_000,
      },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        original_created_at_unix: 1_262_304_000,
        updated_at_unix: null,
        created_at_unix: 1_705_320_000,
      }),
      expect.anything(),
    );
    nowSpy.mockRestore();
  });

  it('ignores original_created_at_unix on DM channels', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle(
      {
        channel_id: 'dm-1',
        body: 'hello',
        original_created_at_unix: 1_262_304_000,
      },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        original_created_at_unix: null,
        updated_at_unix: null,
      }),
      expect.anything(),
    );
    nowSpy.mockRestore();
  });

  it('drops out-of-range original_created_at_unix but still inserts message', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'obj-ch-1',
          kind: CHANNEL_KINDS[2],
          object_id: 'obj-1',
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle(
      {
        channel_id: 'obj-ch-1',
        body: 'archived',
        original_created_at_unix: 0,
      },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        original_created_at_unix: null,
        body: 'archived',
      }),
      expect.anything(),
    );
    nowSpy.mockRestore();
  });

  it('stores valid same-channel reply_to', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'ch-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
      messages: {
        tombstoneExists: jest.fn().mockResolvedValue(false),
        findById: jest.fn().mockImplementation(async (id: string) =>
          id === 'parent-0-0-0'
            ? { message_id: 'parent-0-0-0', channel_id: 'ch-1' }
            : null,
        ),
      },
    });

    await handler.handle(
      { channel_id: 'ch-1', body: 're', reply_to: 'parent-0-0-0' },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reply_to: 'parent-0-0-0' }),
      expect.anything(),
    );
  });

  it('skips create when reply_to parent is missing', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'ch-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
      messages: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await handler.handle(
      { channel_id: 'ch-1', body: 're', reply_to: 'parent-0-0-0' },
      baseCtx,
    );

    expect(messages.insertMessage).not.toHaveBeenCalled();
  });

  it('skips create when reply_to parent is in another channel', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'ch-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
      messages: {
        findById: jest.fn().mockImplementation(async (id: string) =>
          id === 'parent-0-0-0'
            ? { message_id: 'parent-0-0-0', channel_id: 'ch-2' }
            : null,
        ),
      },
    });

    await handler.handle(
      { channel_id: 'ch-1', body: 're', reply_to: 'parent-0-0-0' },
      baseCtx,
    );

    expect(messages.insertMessage).not.toHaveBeenCalled();
  });

  it('skips create when reply_to parent is tombstoned', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'ch-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
      messages: {
        tombstoneExists: jest.fn().mockImplementation(async (id: string) => id === 'parent-0-0-0'),
        findById: jest.fn().mockImplementation(async (id: string) =>
          id === 'parent-0-0-0'
            ? { message_id: 'parent-0-0-0', channel_id: 'ch-1' }
            : null,
        ),
      },
    });

    await handler.handle(
      { channel_id: 'ch-1', body: 're', reply_to: 'parent-0-0-0' },
      baseCtx,
    );

    expect(messages.insertMessage).not.toHaveBeenCalled();
  });

  it('TC-016: skips insert when exact source already exists on object channel', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue(OBJECT_CHANNEL),
      },
      messages: {
        findBySource: jest.fn().mockResolvedValue({
          message_id: 'existing-1',
          source_platform: 'instagram',
          source_id: 'ABC123',
        }),
      },
    });

    await handler.handle(
      {
        channel_id: 'obj-ch-1',
        body: 'rewritten',
        source: {
          platform: 'instagram',
          id: 'ABC123',
          fp_v: 1,
          text_simhash: '9528595b27876241',
        },
      },
      baseCtx,
    );

    expect(messages.insertMessage).not.toHaveBeenCalled();
  });

  it('TC-017: stores source platform, text_simhash, and fingerprint_v on object channel', async () => {
    const simhash = computeActivityFingerprint(LONG_CAPTION).textSimhash!;
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue(OBJECT_CHANNEL),
      },
    });

    await handler.handle(
      {
        channel_id: 'obj-ch-1',
        body: 'rewritten',
        original_created_at_unix: 1_700_000_000,
        source: {
          platform: 'instagram',
          id: 'ABC123',
          fp_v: 1,
          text_simhash: formatPHashHex(simhash),
        },
      },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source_platform: 'instagram',
        source_id: 'ABC123',
        text_simhash: simhash,
        fingerprint_v: 1,
      }),
      expect.anything(),
    );
  });

  it('TC-018: ignores source fields on DM channels', async () => {
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue({
          channel_id: 'dm-1',
          kind: CHANNEL_KINDS[0],
          object_id: null,
          title: null,
          dissolved_at_unix: null,
        }),
      },
    });

    await handler.handle(
      {
        channel_id: 'dm-1',
        body: 'hello',
        source: {
          platform: 'instagram',
          id: 'ABC123',
          fp_v: 1,
          text_simhash: '9528595b27876241',
        },
      },
      baseCtx,
    );

    expect(messages.findBySource).not.toHaveBeenCalled();
    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source_platform: null,
        source_id: null,
        text_simhash: null,
        fingerprint_v: null,
        dup_group_id: 'tx-1-0-0-0',
      }),
      expect.anything(),
    );
  });

  it('TC-019: joins dup cluster when dedup candidate matches', async () => {
    const simhash = computeActivityFingerprint(LONG_CAPTION).textSimhash!;
    const { handler, messages } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue(OBJECT_CHANNEL),
      },
      messages: {
        listDedupCandidates: jest.fn().mockResolvedValue([
          {
            message_id: 'existing-root',
            dup_group_id: 'existing-root',
            text_simhash: simhash,
            image_phashes: [],
            sort_time_unix: 1_700_000_000,
            event_seq: BigInt(1),
          },
        ]),
      },
    });

    await handler.handle(
      {
        channel_id: 'obj-ch-1',
        body: 'rewritten',
        original_created_at_unix: 1_700_000_000,
        source: {
          platform: 'instagram',
          id: 'NEW456',
          fp_v: 1,
          text_simhash: formatPHashHex(simhash),
        },
      },
      baseCtx,
    );

    expect(messages.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        dup_group_id: 'existing-root',
      }),
      expect.anything(),
    );
  });

  it('TC-022: does not throw when insertMessage hits unique constraint', async () => {
    const { handler, messages, notificationEmitter } = makeHandler({
      channels: {
        findById: jest.fn().mockResolvedValue(OBJECT_CHANNEL),
      },
      messages: {
        insertMessage: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(
      handler.handle({ channel_id: 'obj-ch-1', body: 'hello' }, baseCtx),
    ).resolves.toBeUndefined();

    expect(notificationEmitter.emitWithContext).not.toHaveBeenCalled();
  });
});
