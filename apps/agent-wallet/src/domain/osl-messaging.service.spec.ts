import { ConfigService } from '@nestjs/config';
import {
  demoMemoKeyPair,
  encryptEphemeralOneWay,
} from '@opden-data-layer/hive-memo-crypto';

import {
  computeActivityFingerprint,
  formatPHashHex,
} from '@opden-data-layer/core';

import { OslMessagingService } from './osl-messaging.service';
import { LocalKeysService } from './local-keys.service';

const LONG_CAPTION =
  'Our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening';

describe('OslMessagingService', () => {
  const demo = demoMemoKeyPair('osl-messaging-service-spec');

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'oslCustomJsonId') {
        return 'osl-testnet';
      }
      if (key === 'signingMode') {
        return 'local';
      }
      if (key === 'defaultAccount') {
        return 'alice';
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const localKeys = {
    isMemoReady: jest.fn().mockReturnValue(true),
    hasAccount: jest.fn().mockReturnValue(true),
    getMemoPrivateKey: jest.fn().mockReturnValue({ toString: () => demo.privateWif }),
    getRpcClient: jest.fn(),
  };

  const service = new OslMessagingService(config, localKeys as unknown as LocalKeysService);

  beforeEach(() => {
    jest.clearAllMocks();
    localKeys.isMemoReady.mockReturnValue(true);
  });

  it('buildMessageCreate returns message_create op', () => {
    const result = service.buildMessageCreate({
      creator: 'alice',
      peer: 'bob',
      body: 'hello',
    });
    expect(result.opsCount).toBe(1);
    expect(result.bytes).toBeGreaterThan(0);
    const op = result.ops[0] as { id: string; json: string };
    expect(op.id).toBe('osl-testnet');
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, string> }[];
    };
    expect(parsed.events[0]?.action).toBe('message_create');
    expect(parsed.events[0]?.payload).toEqual({ peer: 'bob', body: 'hello' });
  });

  it('buildMessageCreate omits reply_to when unset', () => {
    const result = service.buildMessageCreate({
      creator: 'alice',
      channelId: 'ch-1',
      body: 'hello',
    });
    const op = result.ops[0] as { json: string };
    const parsed = JSON.parse(op.json) as {
      events: { payload: Record<string, unknown> }[];
    };
    expect(parsed.events[0]?.payload).toEqual({ channel_id: 'ch-1', body: 'hello' });
    expect(parsed.events[0]?.payload).not.toHaveProperty('reply_to');
  });

  it('buildMessageCreate includes reply_to when set', () => {
    const result = service.buildMessageCreate({
      creator: 'alice',
      channelId: 'ch-1',
      body: 're',
      replyTo: 'parent-0-0-0',
    });
    const op = result.ops[0] as { json: string };
    const parsed = JSON.parse(op.json) as {
      events: { payload: Record<string, string> }[];
    };
    expect(parsed.events[0]?.payload).toEqual({
      channel_id: 'ch-1',
      body: 're',
      reply_to: 'parent-0-0-0',
    });
  });

  it('buildMessageUpdate returns message_update op', () => {
    const result = service.buildMessageUpdate({
      creator: 'alice',
      channelId: 'ch-1',
      messageId: 'tx-0-0-0',
      body: 'hello edited',
    });
    const op = result.ops[0] as { json: string };
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, string> }[];
    };
    expect(parsed.events[0]?.action).toBe('message_update');
    expect(parsed.events[0]?.payload).toEqual({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
      body: 'hello edited',
    });
    expect(parsed.events[0]?.payload).not.toHaveProperty('encrypted_body');
  });

  it('buildMessageDelete returns message_delete op', () => {
    const result = service.buildMessageDelete({
      creator: 'alice',
      channelId: 'ch-1',
      messageId: 'tx-0-0-0',
    });
    const op = result.ops[0] as { json: string };
    const parsed = JSON.parse(op.json) as {
      events: { action: string; payload: Record<string, string> }[];
    };
    expect(parsed.events[0]?.action).toBe('message_delete');
    expect(parsed.events[0]?.payload).toEqual({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
    });
  });

  it('rejects encrypted build when creator account is not in local registry', async () => {
    localKeys.hasAccount.mockReturnValue(false);

    await expect(
      service.buildEncryptedMessageCreate({
        creator: 'alice',
        peer: 'bob',
        recipient: 'bob',
        plaintext: 'secret',
        mode: 'memo',
      }),
    ).rejects.toThrow(/locally configured account/);

    localKeys.hasAccount.mockReturnValue(true);
  });

  it('memoEncrypt supports ephemeral without sender memo key', async () => {
    localKeys.isMemoReady.mockReturnValue(false);
    const ciphertext = encryptEphemeralOneWay(demo.publicMemo, 'secret');
    const result = await service.memoEncrypt({
      recipientMemoPublic: demo.publicMemo,
      plaintext: 'secret',
      mode: 'ephemeral',
    });
    expect(result.ciphertext.startsWith('#')).toBe(true);
    expect(result.ciphertext).not.toBe(ciphertext);
  });

  it('memoDecrypt round-trips memo-mode ciphertext', async () => {
    const encrypted = await service.memoEncrypt({
      recipientMemoPublic: demo.publicMemo,
      plaintext: 'hello agent',
      mode: 'memo',
    });
    expect(service.memoDecrypt({ ciphertext: encrypted.ciphertext })).toBe('hello agent');
  });

  it('buildChannelCreate uses osl custom_json id', () => {
    const result = service.buildChannelCreate({
      kind: 'group',
      creator: 'alice',
      channelId: 'grp-test',
      members: ['bob'],
    });
    const op = result.ops[0] as { id: string };
    expect(op.id).toBe('osl-testnet');
  });

  it('activityFingerprint matches core test vectors', () => {
    const fromService = service.activityFingerprint(LONG_CAPTION);
    const fromCore = computeActivityFingerprint(LONG_CAPTION);
    expect(fromService.v).toBe(fromCore.v);
    expect(fromService.textSimhash).toBe(
      fromCore.textSimhash != null ? formatPHashHex(fromCore.textSimhash) : null,
    );
    expect(fromService.normalizedLength).toBe(fromCore.normalizedLength);
  });

  it('buildMessageCreate forwards source metadata into the payload', () => {
    const result = service.buildMessageCreate({
      creator: 'alice',
      channelId: 'obj-ch-rest-1',
      body: 'rewritten caption',
      originalCreatedAtUnix: 1_700_000_000,
      source: {
        platform: 'instagram',
        id: 'ABC123',
        fpV: 1,
        textSimhash: '0f0f0f0f0f0f0f0f',
      },
    });
    const op = result.ops[0] as { json: string };
    const parsed = JSON.parse(op.json) as {
      events: { payload: { source?: Record<string, unknown> } }[];
    };
    expect(parsed.events[0]?.payload.source).toEqual({
      platform: 'instagram',
      id: 'ABC123',
      fp_v: 1,
      text_simhash: '0f0f0f0f0f0f0f0f',
    });
  });

  it('buildEncryptedMessageCreate uses osl custom_json id and supports ephemeral without memo key', async () => {
    localKeys.isMemoReady.mockReturnValue(false);
    localKeys.getRpcClient.mockReturnValue({
      database: {
        getAccounts: jest.fn().mockResolvedValue([{ memo_key: demo.publicMemo }]),
      },
    });

    const result = await service.buildEncryptedMessageCreate({
      creator: 'alice',
      peer: 'bob',
      recipient: 'bob',
      plaintext: 'secret',
      mode: 'ephemeral',
    });

    expect(result.opsCount).toBe(1);
    const op = result.ops[0] as { id: string; json: string };
    expect(op.id).toBe('osl-testnet');
    const parsed = JSON.parse(op.json) as {
      events: { payload: { encrypted_body?: string; encryption?: { mode: string } } }[];
    };
    expect(parsed.events[0]?.payload.encrypted_body?.startsWith('#')).toBe(true);
    expect(parsed.events[0]?.payload.encryption?.mode).toBe('ephemeral');
  });
});
