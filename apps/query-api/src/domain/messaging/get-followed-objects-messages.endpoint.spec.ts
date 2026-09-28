import { BadRequestException } from '@nestjs/common';
import type { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import type { MessagingRepository, ObjectActivityMessageRow } from '../../repositories/messaging.repository';
import type { UserAccountMutesRepository } from '../../repositories/user-account-mutes.repository';
import type { GovernanceResolverService } from '../governance';
import { GetFollowedObjectsMessagesEndpoint } from './get-followed-objects-messages.endpoint';
import { decodeMessageCursor } from './message-feed-cursor';
import { messageHistoryBodySchema } from './schemas/messaging.schema';
import { ZodBodyPipe } from '../../pipes/zod-body.pipe';

function activityRow(
  overrides: Partial<ObjectActivityMessageRow> &
    Pick<ObjectActivityMessageRow, 'message_id' | 'created_at_unix' | 'event_seq'>,
): ObjectActivityMessageRow {
  return {
    channel_id: 'ch-a',
    author: 'visible',
    body: 'body',
    overflow_ref: null,
    encrypted_body: null,
    encryption_mode: null,
    encrypted_to: null,
    encryption_v: null,
    encryption_meta: null,
    reply_to: null,
    quote_json: null,
    attachments: null,
    mentions: [],
    linked_object_ids: [],
    source_platform: null,
    source_id: null,
    text_simhash: null,
    image_phashes: [],
    fingerprint_v: null,
    original_created_at_unix: null,
    updated_at_unix: null,
    transaction_id: 'tx',
    search_vector: null,
    channel_object_id: 'obj-a',
    duplicate_count: 1,
    dup_group_id: overrides.message_id,
    ...overrides,
  };
}

describe('GetFollowedObjectsMessagesEndpoint', () => {
  const accounts = { findByName: jest.fn() };
  const messaging = {
    listFollowedObjectActivityMessages: jest.fn(),
    findObjectChannelTitles: jest.fn(),
  };
  const governance = { resolveMergedForObjectView: jest.fn() };
  const mutes = { listMutedForMuters: jest.fn() };

  const endpoint = new GetFollowedObjectsMessagesEndpoint(
    accounts as unknown as AccountsCurrentRepository,
    messaging as unknown as MessagingRepository,
    governance as unknown as GovernanceResolverService,
    mutes as unknown as UserAccountMutesRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    governance.resolveMergedForObjectView.mockResolvedValue({ muted: [] });
    mutes.listMutedForMuters.mockResolvedValue([]);
    messaging.findObjectChannelTitles.mockResolvedValue(new Map());
    messaging.listFollowedObjectActivityMessages.mockResolvedValue([]);
  });

  it('TC-001 rejects an unknown account', async () => {
    accounts.findByName.mockResolvedValue(undefined);

    const result = await endpoint.execute('missing', messageHistoryBodySchema.parse({}));

    expect(result).toBeNull();
  });

  it('TC-002 returns an empty page when the account follows nothing active', async () => {
    accounts.findByName.mockResolvedValue({ name: 'alice' });

    const result = await endpoint.execute('alice', messageHistoryBodySchema.parse({}));

    expect(result).toEqual({ items: [], cursor: null, hasMore: false });
  });

  it('TC-003 encodes the cursor from coalesced time when another row exists', async () => {
    accounts.findByName.mockResolvedValue({ name: 'alice' });
    messaging.listFollowedObjectActivityMessages.mockResolvedValue([
      activityRow({
        message_id: 'msg-a',
        original_created_at_unix: 400,
        created_at_unix: 100,
        event_seq: BigInt(9),
      }),
      activityRow({
        message_id: 'msg-b',
        original_created_at_unix: null,
        created_at_unix: 50,
        event_seq: BigInt(3),
      }),
    ]);

    const result = await endpoint.execute('alice', messageHistoryBodySchema.parse({ limit: 1 }));

    expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    expect(result?.hasMore).toBe(true);
    expect(decodeMessageCursor(result?.cursor ?? '')).toEqual({
      createdAtUnix: 400,
      eventSeq: BigInt(9),
    });
  });

  it('TC-004 omits the cursor on the last page', async () => {
    accounts.findByName.mockResolvedValue({ name: 'alice' });
    messaging.listFollowedObjectActivityMessages.mockResolvedValue([
      activityRow({ message_id: 'msg-a', created_at_unix: 10, event_seq: BigInt(1) }),
    ]);

    const result = await endpoint.execute('alice', messageHistoryBodySchema.parse({ limit: 2 }));

    expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    expect(result?.cursor).toBeNull();
    expect(result?.hasMore).toBe(false);
  });

  it('TC-005 attributes the item to the native channel title', async () => {
    accounts.findByName.mockResolvedValue({ name: 'alice' });
    messaging.listFollowedObjectActivityMessages.mockResolvedValue([
      activityRow({
        message_id: 'msg-a',
        created_at_unix: 10,
        event_seq: BigInt(1),
        channel_object_id: 'obj-a',
      }),
    ]);
    messaging.findObjectChannelTitles.mockResolvedValue(new Map([['obj-a', 'Alpha']]));

    const result = await endpoint.execute('alice', messageHistoryBodySchema.parse({ limit: 10 }));
    const item = result?.items[0];

    expect(item?.object).toEqual({ object_id: 'obj-a', name: 'Alpha' });
    expect(item?.source_object).toBeNull();
  });

  it('TC-006 falls back to the object id when the channel has no title', async () => {
    accounts.findByName.mockResolvedValue({ name: 'alice' });
    messaging.listFollowedObjectActivityMessages.mockResolvedValue([
      activityRow({
        message_id: 'msg-a',
        created_at_unix: 10,
        event_seq: BigInt(1),
        channel_object_id: 'obj-a',
      }),
    ]);

    const result = await endpoint.execute('alice', messageHistoryBodySchema.parse({ limit: 10 }));

    expect(result?.items[0]?.object).toEqual({ object_id: 'obj-a', name: 'obj-a' });
    expect(result?.items[0]?.source_object).toBeNull();
  });

  it('TC-025 rejects a limit outside 1-100', () => {
    const pipe = new ZodBodyPipe(messageHistoryBodySchema);

    expect(() => pipe.transform({ limit: 0 })).toThrow(BadRequestException);
    expect(() => pipe.transform({ limit: 101 })).toThrow(BadRequestException);
  });
});
