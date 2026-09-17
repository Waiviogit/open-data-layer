import { GetObjectChannelMessagesEndpoint } from './get-object-channel.endpoint';
import type { MessagingRepository } from '../../repositories/messaging.repository';
import type { ObjectsCoreRepository } from '../../repositories/objects-core.repository';
import type { GovernanceResolverService } from '../governance';
import type { UserAccountMutesRepository } from '../../repositories';

describe('GetObjectChannelMessagesEndpoint', () => {
  const objectId = 'dish-1';

  function makeEndpoint(overrides: {
    messaging?: Partial<MessagingRepository>;
    objectsCore?: Partial<ObjectsCoreRepository>;
    governance?: Partial<GovernanceResolverService>;
    mutes?: Partial<UserAccountMutesRepository>;
  } = {}) {
    const objectsCore = {
      findByObjectIdForPage: jest.fn().mockResolvedValue({ object_id: objectId }),
      ...overrides.objectsCore,
    } as unknown as ObjectsCoreRepository;

    const messaging = {
      listObjectActivityMessages: jest.fn().mockResolvedValue([]),
      findObjectChannelTitles: jest.fn().mockResolvedValue(new Map()),
      ...overrides.messaging,
    } as unknown as MessagingRepository;

    const governance = {
      resolveMergedForObjectView: jest.fn().mockResolvedValue({ muted: [] }),
      ...overrides.governance,
    } as unknown as GovernanceResolverService;

    const mutes = {
      listMutedForMuters: jest.fn().mockResolvedValue([]),
      ...overrides.mutes,
    } as unknown as UserAccountMutesRepository;

    return {
      endpoint: new GetObjectChannelMessagesEndpoint(
        objectsCore,
        messaging,
        governance,
        mutes,
      ),
      messaging,
      objectsCore,
    };
  }

  it('returns null when object does not exist', async () => {
    const { endpoint } = makeEndpoint({
      objectsCore: { findByObjectIdForPage: jest.fn().mockResolvedValue(undefined) },
    });

    await expect(
      endpoint.execute('missing', { limit: 20 }),
    ).resolves.toBeNull();
  });

  it('returns mention rows when object has no native channel', async () => {
    const { endpoint, messaging } = makeEndpoint({
      messaging: {
        listObjectActivityMessages: jest.fn().mockResolvedValue([
          {
            message_id: 'm-mention',
            channel_id: 'obj-ch-rest',
            channel_object_id: 'rest-1',
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
            transaction_id: 'tx-1',
            search_vector: null,
          },
        ]),
        findObjectChannelTitles: jest.fn().mockResolvedValue(
          new Map([['rest-1', 'The Broken Whisk']]),
        ),
      },
    });

    const result = await endpoint.execute(objectId, { limit: 20 });
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.source_object).toEqual({
      object_id: 'rest-1',
      name: 'The Broken Whisk',
    });
    expect(messaging.listObjectActivityMessages).toHaveBeenCalledWith(
      objectId,
      [],
      null,
      21,
      undefined,
      false,
    );
  });

  it('sets source_object null on native rows', async () => {
    const { endpoint } = makeEndpoint({
      messaging: {
        listObjectActivityMessages: jest.fn().mockResolvedValue([
          {
            message_id: 'm-native',
            channel_id: 'obj-ch-dish',
            channel_object_id: objectId,
            author: 'alice',
            body: 'native',
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
            transaction_id: 'tx-1',
            search_vector: null,
          },
        ]),
      },
    });

    const result = await endpoint.execute(objectId, { limit: 20 });
    expect(result?.items[0]?.source_object).toBeNull();
  });

  it('encodes cursor from original stamp when present', async () => {
    const { endpoint } = makeEndpoint({
      messaging: {
        listObjectActivityMessages: jest
          .fn()
          .mockResolvedValueOnce([
            {
              message_id: 'm-2',
              channel_id: 'obj-ch-dish',
              channel_object_id: objectId,
              author: 'alice',
              body: 'stamped newest sort',
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
              original_created_at_unix: 1_262_304_000,
              updated_at_unix: null,
              created_at_unix: 100,
              event_seq: BigInt(1),
              transaction_id: 'tx-1',
              search_vector: null,
            },
            {
              message_id: 'm-1',
              channel_id: 'obj-ch-dish',
              channel_object_id: objectId,
              author: 'alice',
              body: 'newer publication unstamped',
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
              created_at_unix: 200,
              event_seq: BigInt(2),
              transaction_id: 'tx-2',
              search_vector: null,
            },
          ]),
      },
    });

    const result = await endpoint.fetchObjectActivityMessages(
      objectId,
      { limit: 1 },
      [],
    );

    expect(result.hasMore).toBe(true);
    expect(result.cursor).not.toBeNull();
    const decoded = JSON.parse(
      Buffer.from(result.cursor ?? '', 'base64url').toString('utf8'),
    );
    expect(decoded.createdAtUnix).toBe(1_262_304_000);
  });
});
