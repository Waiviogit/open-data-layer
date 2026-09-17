import { mapMessageToDto, resolveLastMessagePreview } from './message-projection';

function activityDefaults(messageId: string) {
  return {
    source_platform: null,
    source_id: null,
    text_simhash: null,
    image_phashes: [] as bigint[],
    fingerprint_v: null,
    dup_group_id: messageId,
  };
}

describe('message-projection', () => {
  it('maps encrypted row to MessageDto with encryption object', () => {
    const dto = mapMessageToDto({
      message_id: 'm1',
      ...activityDefaults('m1'),
      channel_id: 'c1',
      author: 'alice',
      body: null,
      encrypted_body: '#Ab3xYz',
      encryption_mode: 'memo',
      encrypted_to: 'bob',
      encryption_v: 1,
      encryption_meta: null,
      overflow_ref: null,
      reply_to: null,
      quote_json: null,
      attachments: null,
      mentions: [],
      linked_object_ids: [],
      original_created_at_unix: 1_262_304_000,
      updated_at_unix: null,
      created_at_unix: 100,
      event_seq: BigInt(1),
      transaction_id: 'tx1',
      search_vector: null,
    });
    expect(dto.encryption).toEqual({ v: 1, mode: 'memo', to: 'bob' });
    expect(dto.encrypted_body).toBe('#Ab3xYz');
    expect(dto.body).toBeNull();
    expect(dto.original_created_at_unix).toBe(1_262_304_000);
    expect(dto.updated_at_unix).toBeNull();
    expect(dto.source_object).toBeNull();
  });

  it('resolveLastMessagePreview returns encrypted flag without ciphertext', () => {
    expect(
      resolveLastMessagePreview({
        body: null,
        overflow_ref: null,
        encryption_mode: 'ephemeral',
      }),
    ).toEqual({ preview: null, encrypted: true });
  });

  it('resolveLastMessagePreview returns plain body', () => {
    expect(
      resolveLastMessagePreview({
        body: 'hello',
        overflow_ref: null,
        encryption_mode: null,
      }),
    ).toEqual({ preview: 'hello', encrypted: false });
  });

  it('maps updated_at_unix on DTO', () => {
    const dto = mapMessageToDto({
      message_id: 'm1',
      ...activityDefaults('m1'),
      channel_id: 'c1',
      author: 'alice',
      body: 'hello',
      encrypted_body: null,
      encryption_mode: null,
      encrypted_to: null,
      encryption_v: null,
      encryption_meta: null,
      overflow_ref: null,
      reply_to: null,
      quote_json: null,
      attachments: null,
      mentions: [],
      linked_object_ids: [],
      original_created_at_unix: null,
      updated_at_unix: 1_700_000_100,
      created_at_unix: 100,
      event_seq: BigInt(1),
      transaction_id: 'tx1',
      search_vector: null,
    });
    expect(dto.updated_at_unix).toBe(1_700_000_100);
  });

  it('sets source_object on mention-only activity rows', () => {
    const dto = mapMessageToDto(
      {
        message_id: 'm1',
        ...activityDefaults('m1'),
        channel_id: 'obj-ch-rest',
        author: 'alice',
        body: 'see dish',
        encrypted_body: null,
        encryption_mode: null,
        encrypted_to: null,
        encryption_v: null,
        encryption_meta: null,
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        linked_object_ids: ['dish-1'],
        original_created_at_unix: null,
        updated_at_unix: null,
        created_at_unix: 100,
        event_seq: BigInt(1),
        transaction_id: 'tx1',
        search_vector: null,
      },
      {
        requestedObjectId: 'dish-1',
        channelObjectId: 'rest-1',
        sourceNameByObjectId: new Map([['rest-1', 'The Broken Whisk']]),
      },
    );
    expect(dto.source_object).toEqual({
      object_id: 'rest-1',
      name: 'The Broken Whisk',
    });
  });

  it('TC-040/041: projects source and duplicate fields', () => {
    const canonical = mapMessageToDto(
      {
        message_id: 'root-1',
        ...activityDefaults('root-1'),
        source_platform: 'instagram',
        source_id: 'ABC123',
        channel_id: 'obj-ch-1',
        author: 'alice',
        body: 'hello',
        encrypted_body: null,
        encryption_mode: null,
        encrypted_to: null,
        encryption_v: null,
        encryption_meta: null,
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        linked_object_ids: [],
        original_created_at_unix: null,
        updated_at_unix: null,
        created_at_unix: 100,
        event_seq: BigInt(1),
        transaction_id: 'tx1',
        search_vector: null,
      },
      { duplicateCount: 3 },
    );
    expect(canonical.source).toEqual({ platform: 'instagram', id: 'ABC123' });
    expect(canonical.duplicate_of).toBeNull();
    expect(canonical.duplicate_count).toBe(3);

    const member = mapMessageToDto(
      {
        message_id: 'm-2',
        ...activityDefaults('m-2'),
        dup_group_id: 'root-1',
        channel_id: 'obj-ch-1',
        author: 'alice',
        body: 'dup',
        encrypted_body: null,
        encryption_mode: null,
        encrypted_to: null,
        encryption_v: null,
        encryption_meta: null,
        overflow_ref: null,
        reply_to: null,
        quote_json: null,
        attachments: null,
        mentions: [],
        linked_object_ids: [],
        original_created_at_unix: null,
        updated_at_unix: null,
        created_at_unix: 101,
        event_seq: BigInt(2),
        transaction_id: 'tx2',
        search_vector: null,
      },
      { duplicateCount: 1 },
    );
    expect(member.duplicate_of).toBe('root-1');
  });
});
