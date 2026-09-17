import {
  computeActivityFingerprint,
  formatPHashHex,
} from '@opden-data-layer/core';

import { CheckActivityDuplicateEndpoint } from './check-activity-duplicate.endpoint';
import type { MessagingRepository } from '../../repositories/messaging.repository';
import type { ObjectsCoreRepository } from '../../repositories/objects-core.repository';

const LONG_CAPTION =
  'Our seasonal tasting menu features locally sourced ingredients prepared by our award winning chef team every evening';

function activityFields(messageId: string) {
  return {
    source_platform: null as string | null,
    source_id: null as string | null,
    text_simhash: null as bigint | null,
    image_phashes: [] as bigint[],
    fingerprint_v: null as number | null,
    dup_group_id: messageId,
  };
}

describe('CheckActivityDuplicateEndpoint', () => {
  function makeEndpoint(overrides: {
    objectsCore?: Partial<ObjectsCoreRepository>;
    messaging?: Partial<MessagingRepository>;
  } = {}) {
    const objectsCore = {
      findByObjectIdForPage: jest.fn().mockResolvedValue({ object_id: 'dish-1' }),
      ...overrides.objectsCore,
    } as unknown as ObjectsCoreRepository;

    const messaging = {
      findObjectChannel: jest.fn().mockResolvedValue({
        channel_id: 'obj-ch-dish-1',
        object_id: 'dish-1',
      }),
      findObjectMessageBySource: jest.fn().mockResolvedValue(undefined),
      listActivityDedupCandidates: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(undefined),
      ...overrides.messaging,
    } as unknown as MessagingRepository;

    return {
      endpoint: new CheckActivityDuplicateEndpoint(objectsCore, messaging),
      objectsCore,
      messaging,
    };
  }

  it('TC-027: returns null for unknown object', async () => {
    const { endpoint } = makeEndpoint({
      objectsCore: { findByObjectIdForPage: jest.fn().mockResolvedValue(undefined) },
    });

    await expect(
      endpoint.execute('missing', {
        original_text: LONG_CAPTION,
        original_created_at_unix: 1_700_000_000,
      }),
    ).resolves.toBeNull();
  });

  it('TC-028: returns duplicate false when object has no channel', async () => {
    const { endpoint } = makeEndpoint({
      messaging: { findObjectChannel: jest.fn().mockResolvedValue(null) },
    });

    const result = await endpoint.execute('dish-1', {
      original_text: LONG_CAPTION,
      original_created_at_unix: 1_700_000_000,
    });

    expect(result).toEqual({
      duplicate: false,
      reason: null,
      match: null,
      fingerprint: expect.objectContaining({
        v: 1,
        text_simhash: expect.any(String),
      }),
      candidates_scanned: 0,
    });
  });

  it('TC-029: reports exact source duplicate', async () => {
    const matchRow = {
      message_id: 'msg-1',
      channel_id: 'obj-ch-dish-1',
      author: 'alice',
      body: 'rewritten',
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
      original_created_at_unix: 1_700_000_000,
      updated_at_unix: null,
      created_at_unix: 1_700_000_100,
      event_seq: BigInt(1),
      transaction_id: 'tx-1',
      search_vector: null,
      ...activityFields('msg-1'),
      source_platform: 'instagram',
      source_id: 'ABC123',
    };

    const { endpoint } = makeEndpoint({
      messaging: {
        findObjectMessageBySource: jest.fn().mockResolvedValue(matchRow),
      },
    });

    const result = await endpoint.execute('dish-1', {
      source: { platform: 'instagram', id: 'ABC123' },
      original_created_at_unix: 1_700_000_000,
    });

    expect(result?.duplicate).toBe(true);
    expect(result?.reason).toBe('source');
    expect(result?.match?.message_id).toBe('msg-1');
    expect(result?.candidates_scanned).toBe(0);
  });

  it('TC-030: reports simhash near-duplicate from candidate scan', async () => {
    const simhash = computeActivityFingerprint(LONG_CAPTION).textSimhash!;
    const matchRow = {
      message_id: 'msg-simhash',
      channel_id: 'obj-ch-dish-1',
      author: 'alice',
      body: 'rewritten',
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
      original_created_at_unix: 1_700_000_000,
      updated_at_unix: null,
      created_at_unix: 1_700_000_100,
      event_seq: BigInt(1),
      transaction_id: 'tx-1',
      search_vector: null,
      ...activityFields('msg-simhash'),
      text_simhash: simhash,
      fingerprint_v: 1,
    };

    const { endpoint } = makeEndpoint({
      messaging: {
        listActivityDedupCandidates: jest.fn().mockResolvedValue([
          {
            message_id: 'msg-simhash',
            dup_group_id: 'msg-simhash',
            text_simhash: simhash,
            image_phashes: [],
            sort_time_unix: 1_700_000_000,
            event_seq: BigInt(1),
          },
        ]),
        findById: jest.fn().mockResolvedValue(matchRow),
      },
    });

    const result = await endpoint.execute('dish-1', {
      original_text: LONG_CAPTION,
      original_created_at_unix: 1_700_000_000,
    });

    expect(result?.duplicate).toBe(true);
    expect(result?.reason).toBe('simhash');
    expect(result?.match?.message_id).toBe('msg-simhash');
    expect(result?.candidates_scanned).toBe(1);
  });

  it('TC-033: echoes fingerprint computed from original_text', async () => {
    const { endpoint } = makeEndpoint();
    const expected = computeActivityFingerprint(LONG_CAPTION);

    const result = await endpoint.execute('dish-1', {
      original_text: LONG_CAPTION,
      original_created_at_unix: 1_700_000_000,
    });

    expect(result?.fingerprint.text_simhash).toBe(
      expected.textSimhash != null ? formatPHashHex(expected.textSimhash) : null,
    );
    expect(result?.fingerprint.normalized_length).toBe(expected.normalizedLength);
  });
});
