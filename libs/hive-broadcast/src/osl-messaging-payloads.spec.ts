import {
  buildEncryptedMessageCreatePayload,
  buildGroupChannelCreatePayload,
  buildMessageCreatePayload,
  buildMessageDeletePayload,
  buildMessageUpdatePayload,
  buildObjectChannelCreatePayload,
  generateGroupChannelId,
} from './osl-messaging-payloads';
import {
  buildOslMessageDeleteOp,
  buildOslMessageUpdateOp,
} from './osl-operations';

describe('osl-messaging-payloads', () => {
  it('generateGroupChannelId returns grp- prefixed uuid', () => {
    const id = generateGroupChannelId();
    expect(id.startsWith('grp-')).toBe(true);
    expect(id.length).toBeLessThanOrEqual(256);
  });

  it('buildGroupChannelCreatePayload excludes viewer from members', () => {
    expect(
      buildGroupChannelCreatePayload({
        channelId: 'grp-1',
        members: ['Alice', ' bob ', 'alice'],
        viewerUsername: 'alice',
        title: ' Ops ',
      }),
    ).toEqual({
      kind: 'group',
      channel_id: 'grp-1',
      members: ['bob'],
      title: 'Ops',
    });
  });

  it('buildObjectChannelCreatePayload uses deterministic channel id', () => {
    const payload = buildObjectChannelCreatePayload({
      objectId: 'product-1',
      objectName: 'Widget',
    });
    expect(payload['kind']).toBe('object');
    expect(payload['object_id']).toBe('product-1');
    expect(payload['title']).toBe('Widget');
    expect(typeof payload['channel_id']).toBe('string');
  });

  it('buildMessageCreatePayload requires channelId or peer', () => {
    expect(() => buildMessageCreatePayload({ body: 'hi' })).toThrow(
      'channelId or peer is required',
    );
    expect(buildMessageCreatePayload({ peer: 'bob', body: ' hi ' })).toEqual({
      peer: 'bob',
      body: 'hi',
    });
  });

  it('omits original_created_at_unix when unset', () => {
    expect(
      buildMessageCreatePayload({ channelId: 'obj-ch-1', body: 'hello' }),
    ).toEqual({
      channel_id: 'obj-ch-1',
      body: 'hello',
    });
  });

  it('includes original_created_at_unix as integer seconds', () => {
    expect(
      buildMessageCreatePayload({
        channelId: 'obj-ch-1',
        body: 'hello',
        originalCreatedAtUnix: 1_262_304_000,
      }),
    ).toEqual({
      channel_id: 'obj-ch-1',
      body: 'hello',
      original_created_at_unix: 1_262_304_000,
    });
  });

  it('never emits updated_at_unix', () => {
    const payload = buildMessageCreatePayload({
      channelId: 'obj-ch-1',
      body: 'hello',
      originalCreatedAtUnix: 1_262_304_000,
    });
    expect(payload).not.toHaveProperty('updated_at_unix');
  });

  it('buildEncryptedMessageCreatePayload adds encryption metadata', () => {
    expect(
      buildEncryptedMessageCreatePayload({
        channelId: 'grp-1',
        ciphertext: '#AbC',
        mode: 'memo',
        to: 'bob',
      }),
    ).toEqual({
      channel_id: 'grp-1',
      encrypted_body: '#AbC',
      encryption: { v: 1, mode: 'memo', to: 'bob' },
    });
  });

  it('includes reply_to and quote_json when set', () => {
    expect(
      buildMessageCreatePayload({
        channelId: 'ch-1',
        body: 're',
        replyTo: 'parent-0-0-0',
        quoteJson: { author: 'bob', body: 'hello' },
      }),
    ).toEqual({
      channel_id: 'ch-1',
      body: 're',
      reply_to: 'parent-0-0-0',
      quote_json: { author: 'bob', body: 'hello' },
    });
  });

  it('omits reply fields when unset', () => {
    const payload = buildMessageCreatePayload({ channelId: 'ch-1', body: 'hello' });
    expect(payload).not.toHaveProperty('reply_to');
    expect(payload).not.toHaveProperty('quote_json');
  });

  it('includes source with fingerprint fields when set', () => {
    expect(
      buildMessageCreatePayload({
        channelId: 'obj-ch-rest-1',
        body: 'rewritten caption',
        originalCreatedAtUnix: 1_700_000_000,
        source: {
          platform: 'instagram',
          id: 'ABC123',
          fpV: 1,
          textSimhash: '0f0f0f0f0f0f0f0f',
          imagePHashes: ['aabbccddeeff0011'],
        },
      }),
    ).toEqual({
      channel_id: 'obj-ch-rest-1',
      body: 'rewritten caption',
      original_created_at_unix: 1_700_000_000,
      source: {
        platform: 'instagram',
        id: 'ABC123',
        fp_v: 1,
        text_simhash: '0f0f0f0f0f0f0f0f',
        image_phashes: ['aabbccddeeff0011'],
      },
    });
  });

  it('omits source when unset', () => {
    const payload = buildMessageCreatePayload({ channelId: 'ch-1', body: 'hello' });
    expect(payload).not.toHaveProperty('source');
  });

  it('TC-043: omits empty fingerprint fields from source (platform+id only)', () => {
    expect(
      buildMessageCreatePayload({
        channelId: 'obj-ch-rest-1',
        body: 'rewritten caption',
        source: {
          platform: 'instagram',
          id: 'ABC123',
          textSimhash: null,
          imagePHashes: [],
        },
      }),
    ).toEqual({
      channel_id: 'obj-ch-rest-1',
      body: 'rewritten caption',
      source: {
        platform: 'instagram',
        id: 'ABC123',
      },
    });
  });

  it('buildMessageUpdatePayload trims body and never emits encrypted_body', () => {
    const payload = buildMessageUpdatePayload({
      channelId: 'ch-1',
      messageId: 'tx-0-0-0',
      body: ' edited ',
    });
    expect(payload).toEqual({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
      body: 'edited',
    });
    expect(payload).not.toHaveProperty('encrypted_body');
  });

  it('buildMessageDeletePayload includes channel and message ids', () => {
    expect(
      buildMessageDeletePayload({ channelId: 'ch-1', messageId: 'tx-0-0-0' }),
    ).toEqual({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
    });
  });

  it('update and delete ops wrap v1 envelopes', () => {
    const updatePayload = buildMessageUpdatePayload({
      channelId: 'ch-1',
      messageId: 'tx-0-0-0',
      body: 'edited',
    });
    const deletePayload = buildMessageDeletePayload({
      channelId: 'ch-1',
      messageId: 'tx-0-0-0',
    });

    const updateOp = buildOslMessageUpdateOp({
      id: 'odl',
      creator: 'alice',
      payload: updatePayload,
    });
    const deleteOp = buildOslMessageDeleteOp({
      id: 'odl',
      creator: 'alice',
      payload: deletePayload,
    });

    expect(JSON.parse(updateOp.json)).toEqual({
      events: [
        {
          action: 'message_update',
          v: 1,
          payload: {
            channel_id: 'ch-1',
            message_id: 'tx-0-0-0',
            body: 'edited',
          },
        },
      ],
    });
    expect(JSON.parse(deleteOp.json)).toEqual({
      events: [
        {
          action: 'message_delete',
          v: 1,
          payload: {
            channel_id: 'ch-1',
            message_id: 'tx-0-0-0',
          },
        },
      ],
    });
    expect(updateOp.required_posting_auths).toEqual(['alice']);
    expect(deleteOp.required_posting_auths).toEqual(['alice']);
  });
});
