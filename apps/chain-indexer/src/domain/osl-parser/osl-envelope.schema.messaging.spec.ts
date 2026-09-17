import {
  channelLeavePayloadSchema,
  channelCreatePayloadSchema,
  messageCreatePayloadSchema,
  messageUpdatePayloadSchema,
} from './osl-envelope.schema';

describe('messageCreatePayloadSchema', () => {
  it('accepts peer bootstrap with body', () => {
    const result = messageCreatePayloadSchema.safeParse({
      peer: 'bob',
      body: 'hi',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing body and overflow_ref', () => {
    const result = messageCreatePayloadSchema.safeParse({ peer: 'bob' });
    expect(result.success).toBe(false);
  });

  it('accepts encrypted message_create payload', () => {
    const result = messageCreatePayloadSchema.safeParse({
      channel_id: 'grp-1',
      encrypted_body: '#Ab3xYz',
      encryption: { v: 1, mode: 'memo', to: 'bob' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects encrypted_body without encryption object', () => {
    const result = messageCreatePayloadSchema.safeParse({
      channel_id: 'grp-1',
      encrypted_body: '#Ab3xYz',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body and encrypted_body together', () => {
    const result = messageCreatePayloadSchema.safeParse({
      channel_id: 'grp-1',
      body: 'hi',
      encrypted_body: '#Ab3xYz',
      encryption: { v: 1, mode: 'memo', to: 'bob' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid ciphertext regex', () => {
    const result = messageCreatePayloadSchema.safeParse({
      channel_id: 'grp-1',
      encrypted_body: 'not-encrypted',
      encryption: { v: 1, mode: 'memo', to: 'bob' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional original_created_at_unix integer', () => {
    const result = messageCreatePayloadSchema.safeParse({
      channel_id: 'obj-ch-1',
      body: 'archived post',
      original_created_at_unix: 1_262_304_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.original_created_at_unix).toBe(1_262_304_000);
    }
  });

  it('TC-021: rejects source with text_simhash but missing fp_v', () => {
    const result = messageCreatePayloadSchema.safeParse({
      channel_id: 'obj-ch-1',
      body: 'archived post',
      source: {
        platform: 'instagram',
        id: 'ABC123',
        text_simhash: '9528595b27876241',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer original_created_at_unix', () => {
    expect(
      messageCreatePayloadSchema.safeParse({
        channel_id: 'obj-ch-1',
        body: 'archived post',
        original_created_at_unix: 1.5,
      }).success,
    ).toBe(false);
    expect(
      messageCreatePayloadSchema.safeParse({
        channel_id: 'obj-ch-1',
        body: 'archived post',
        original_created_at_unix: '1262304000',
      }).success,
    ).toBe(false);
  });
});

describe('channelLeavePayloadSchema', () => {
  it('accepts minimal leave payload', () => {
    const result = channelLeavePayloadSchema.safeParse({ channel_id: 'grp-1' });
    expect(result.success).toBe(true);
  });

  it('accepts leave with successor and delete flag', () => {
    const result = channelLeavePayloadSchema.safeParse({
      channel_id: 'grp-1',
      successor_admin: 'bob',
      delete_my_messages: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty channel_id', () => {
    const result = channelLeavePayloadSchema.safeParse({ channel_id: '' });
    expect(result.success).toBe(false);
  });
});

describe('channelCreatePayloadSchema group members cap', () => {
  it('accepts up to 99 invitees', () => {
    const members = Array.from({ length: 99 }, (_, index) => `user${index}`);
    const result = channelCreatePayloadSchema.safeParse({
      kind: 'group',
      channel_id: 'grp-1',
      members,
    });
    expect(result.success).toBe(true);
  });

  it('rejects 100 invitees in payload', () => {
    const members = Array.from({ length: 100 }, (_, index) => `user${index}`);
    const result = channelCreatePayloadSchema.safeParse({
      kind: 'group',
      channel_id: 'grp-1',
      members,
    });
    expect(result.success).toBe(false);
  });
});

describe('messageUpdatePayloadSchema', () => {
  it('accepts plaintext body update', () => {
    const result = messageUpdatePayloadSchema.safeParse({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
      body: 'edited',
    });
    expect(result.success).toBe(true);
  });

  it('rejects update without body', () => {
    expect(
      messageUpdatePayloadSchema.safeParse({
        channel_id: 'ch-1',
        message_id: 'tx-0-0-0',
      }).success,
    ).toBe(false);
    expect(
      messageUpdatePayloadSchema.safeParse({
        channel_id: 'ch-1',
        message_id: 'tx-0-0-0',
        body: '',
      }).success,
    ).toBe(false);
  });

  it('accepts body length 65535', () => {
    const result = messageUpdatePayloadSchema.safeParse({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
      body: 'x'.repeat(65535),
    });
    expect(result.success).toBe(true);
  });

  it('rejects encrypted_body on update', () => {
    const result = messageUpdatePayloadSchema.safeParse({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
      body: 'edited',
      encrypted_body: '#cipher',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body longer than 65535', () => {
    const result = messageUpdatePayloadSchema.safeParse({
      channel_id: 'ch-1',
      message_id: 'tx-0-0-0',
      body: 'x'.repeat(65536),
    });
    expect(result.success).toBe(false);
  });
});
