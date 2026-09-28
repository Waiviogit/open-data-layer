import type { Kysely } from 'kysely';
import { migrateToLatest } from '@opden-data-layer/migrations';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';
import {
  createTestDb,
  resolveTestPostgresUrl,
  withRollback,
} from '@opden-data-layer/test-postgres';

import type { Database } from '../../database';
import { AccountsCurrentRepository } from '../../repositories/accounts-current.repository';
import { MessagingRepository } from '../../repositories/messaging.repository';
import { UserAccountMutesRepository } from '../../repositories/user-account-mutes.repository';
import type { GovernanceResolverService } from '../governance';
import { GetFollowedObjectsMessagesEndpoint } from './get-followed-objects-messages.endpoint';
import { decodeMessageCursor, encodeMessageCursor } from './message-feed-cursor';
import { messageHistoryBodySchema, type MessageHistoryBody } from './schemas/messaging.schema';

const describeDb = process.env.POSTGRES_TEST_URL ? describe : describe.skip;

type Trx = Kysely<OdlDatabase>;

function endpoint(trx: Trx, muted: readonly string[] = []): GetFollowedObjectsMessagesEndpoint {
  const db = trx as unknown as Kysely<Database>;
  const governance = {
    resolveMergedForObjectView: async () => ({ muted: [...muted] }),
  } as unknown as GovernanceResolverService;
  return new GetFollowedObjectsMessagesEndpoint(
    new AccountsCurrentRepository(db),
    new MessagingRepository(db),
    governance,
    new UserAccountMutesRepository(db),
  );
}

function body(raw: Record<string, unknown> = {}): MessageHistoryBody {
  return messageHistoryBodySchema.parse(raw);
}

async function insertAccount(trx: Trx, name: string): Promise<void> {
  await trx
    .insertInto('accounts_current')
    .values({
      name,
      comment_count: 0,
      lifetime_vote_count: 0,
      post_count: 0,
      object_reputation: 0,
      wobjects_weight: 0,
      last_posts_count: 0,
      users_following_count: 0,
      followers_count: 0,
      stage_version: 0,
    })
    .execute();
}

async function insertObject(
  trx: Trx,
  objectId: string,
  status: 'active' | 'unavailable' = 'active',
): Promise<void> {
  await trx
    .insertInto('objects_core')
    .values({
      object_id: objectId,
      object_type: 'product',
      creator: 'alice',
      transaction_id: `tx-${objectId}`,
      status,
    })
    .execute();
}

async function insertChannel(
  trx: Trx,
  input: {
    channelId: string;
    kind: 'object' | 'group';
    objectId?: string;
    title?: string | null;
  },
): Promise<void> {
  await trx
    .insertInto('channels')
    .values({
      channel_id: input.channelId,
      kind: input.kind,
      creator: 'alice',
      title: input.title ?? null,
      object_id: input.objectId ?? null,
      access: 'public_read',
      dissolved_at_unix: null,
      created_at_unix: 1,
      event_seq: BigInt(1),
      transaction_id: `tx-${input.channelId}`,
    })
    .execute();
}

async function insertMessage(
  trx: Trx,
  input: {
    messageId: string;
    channelId: string;
    author?: string;
    created: number;
    original?: number | null;
    seq: bigint;
    linked?: string[];
    dupGroupId?: string;
  },
): Promise<void> {
  await trx
    .insertInto('messages')
    .values({
      message_id: input.messageId,
      channel_id: input.channelId,
      author: input.author ?? 'visible',
      body: 'body',
      mentions: [],
      linked_object_ids: input.linked ?? [],
      created_at_unix: input.created,
      original_created_at_unix: input.original ?? null,
      event_seq: input.seq,
      transaction_id: `tx-${input.messageId}`,
      dup_group_id: input.dupGroupId ?? input.messageId,
      image_phashes: [],
    })
    .execute();
}

async function follow(
  trx: Trx,
  account: string,
  objectId: string,
  bell = false,
): Promise<void> {
  await trx
    .insertInto('user_object_follows')
    .values({ account, object_id: objectId, bell })
    .execute();
}

describeDb('followed objects message feed', () => {
  const db = createTestDb();

  beforeAll(async () => {
    const migrated = await migrateToLatest({ connectionString: resolveTestPostgresUrl() });
    if (migrated.error) {
      throw migrated.error;
    }
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('TC-007 sorts by coalesced time ahead of raw created_at', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a', title: 'Alpha' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, {
        messageId: 'msg-import',
        channelId: 'ch-a',
        created: 50,
        original: 300,
        seq: BigInt(2),
      });
      await insertMessage(trx, {
        messageId: 'msg-chain',
        channelId: 'ch-a',
        created: 200,
        seq: BigInt(1),
      });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-import', 'msg-chain']);
    });
  });

  it('TC-008 merges followed objects newest coalesced time first', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertObject(trx, 'obj-b');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await insertChannel(trx, { channelId: 'ch-b', kind: 'object', objectId: 'obj-b' });
      await follow(trx, 'alice', 'obj-a');
      await follow(trx, 'alice', 'obj-b');
      await insertMessage(trx, { messageId: 'msg-a', channelId: 'ch-a', created: 100, seq: BigInt(1) });
      await insertMessage(trx, { messageId: 'msg-b', channelId: 'ch-b', created: 250, seq: BigInt(2) });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-b', 'msg-a']);
      expect(result?.items.map((item) => item.object.object_id)).toEqual(['obj-b', 'obj-a']);
    });
  });

  it('TC-009 returns one row when one message matches two follows', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertObject(trx, 'obj-b');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await insertChannel(trx, { channelId: 'ch-b', kind: 'object', objectId: 'obj-b' });
      await follow(trx, 'alice', 'obj-a');
      await follow(trx, 'alice', 'obj-b');
      await insertMessage(trx, {
        messageId: 'msg-1',
        channelId: 'ch-a',
        created: 10,
        seq: BigInt(1),
        linked: ['obj-b'],
      });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-1']);
    });
  });

  it('TC-010 includes a mention of a followed object and names the native channel', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertObject(trx, 'obj-b');
      await insertChannel(trx, {
        channelId: 'ch-a',
        kind: 'object',
        objectId: 'obj-a',
        title: 'Alpha',
      });
      await insertChannel(trx, { channelId: 'ch-b', kind: 'object', objectId: 'obj-b' });
      await follow(trx, 'alice', 'obj-b');
      await insertMessage(trx, {
        messageId: 'msg-m',
        channelId: 'ch-a',
        created: 20,
        seq: BigInt(1),
        linked: ['obj-b'],
      });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]?.message_id).toBe('msg-m');
      expect(result?.items[0]?.object).toEqual({ object_id: 'obj-a', name: 'Alpha' });
      expect(result?.items[0]?.source_object).toBeNull();
    });
  });

  it('TC-011 excludes a message that matches no follow', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertObject(trx, 'obj-c');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await insertChannel(trx, { channelId: 'ch-c', kind: 'object', objectId: 'obj-c' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-a', channelId: 'ch-a', created: 10, seq: BigInt(1) });
      await insertMessage(trx, { messageId: 'msg-other', channelId: 'ch-c', created: 20, seq: BigInt(2) });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    });
  });

  it('TC-012 excludes follows whose object is not active', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertObject(trx, 'obj-d', 'unavailable');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await insertChannel(trx, { channelId: 'ch-d', kind: 'object', objectId: 'obj-d' });
      await follow(trx, 'alice', 'obj-a');
      await follow(trx, 'alice', 'obj-d');
      await insertMessage(trx, { messageId: 'msg-a', channelId: 'ch-a', created: 10, seq: BigInt(1) });
      await insertMessage(trx, { messageId: 'msg-d', channelId: 'ch-d', created: 20, seq: BigInt(2) });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    });
  });

  it('TC-013 excludes non-object channels', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await insertChannel(trx, { channelId: 'ch-dm', kind: 'group' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-a', channelId: 'ch-a', created: 10, seq: BigInt(1) });
      await insertMessage(trx, {
        messageId: 'msg-dm',
        channelId: 'ch-dm',
        created: 30,
        seq: BigInt(2),
        linked: ['obj-a'],
      });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    });
  });

  it('TC-014 returns only the canonical row by default', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-root', channelId: 'ch-a', created: 100, seq: BigInt(2) });
      await insertMessage(trx, {
        messageId: 'msg-dup',
        channelId: 'ch-a',
        created: 90,
        seq: BigInt(1),
        dupGroupId: 'msg-root',
      });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-root']);
    });
  });

  it('TC-015 returns non-canonical rows when duplicates are requested', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-root', channelId: 'ch-a', created: 100, seq: BigInt(2) });
      await insertMessage(trx, {
        messageId: 'msg-dup',
        channelId: 'ch-a',
        created: 90,
        seq: BigInt(1),
        dupGroupId: 'msg-root',
      });

      const result = await endpoint(trx).execute(
        'alice',
        body({ limit: 10, include_duplicates: true }),
      );

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-root', 'msg-dup']);
    });
  });

  it('TC-016 omits governance-muted and viewer-muted authors', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertAccount(trx, 'bob');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await trx
        .insertInto('user_account_mutes')
        .values({ muter: 'bob', muted: 'muted-by-viewer' })
        .execute();
      await insertMessage(trx, {
        messageId: 'msg-gov',
        channelId: 'ch-a',
        author: 'muted-by-gov',
        created: 30,
        seq: BigInt(3),
      });
      await insertMessage(trx, {
        messageId: 'msg-viewer',
        channelId: 'ch-a',
        author: 'muted-by-viewer',
        created: 20,
        seq: BigInt(2),
      });
      await insertMessage(trx, {
        messageId: 'msg-ok',
        channelId: 'ch-a',
        author: 'visible',
        created: 10,
        seq: BigInt(1),
      });

      const result = await endpoint(trx, ['muted-by-gov']).execute('alice', body({ limit: 10 }), undefined, 'bob');

      expect(result?.items.map((item) => item.author)).toEqual(['visible']);
    });
  });

  it('TC-017 continues the keyset without repeating or skipping', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-3', channelId: 'ch-a', created: 300, seq: BigInt(3) });
      await insertMessage(trx, { messageId: 'msg-2', channelId: 'ch-a', created: 200, seq: BigInt(2) });
      await insertMessage(trx, { messageId: 'msg-1', channelId: 'ch-a', created: 100, seq: BigInt(1) });

      const api = endpoint(trx);
      const page1 = await api.execute('alice', body({ limit: 2 }));
      const page2 = await api.execute('alice', body({ limit: 2, cursor: page1?.cursor ?? '' }));

      expect(page1?.items.map((item) => item.message_id)).toEqual(['msg-3', 'msg-2']);
      expect(page1?.hasMore).toBe(true);
      expect(decodeMessageCursor(page1?.cursor ?? '')).toEqual({
        createdAtUnix: 200,
        eventSeq: BigInt(2),
      });
      expect(page2?.items.map((item) => item.message_id)).toEqual(['msg-1']);
      expect(page2?.cursor).toBeNull();
      expect(page2?.hasMore).toBe(false);
    });
  });

  it('TC-018 reads follows of the path account, not the viewer', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertAccount(trx, 'bob');
      await insertObject(trx, 'obj-a');
      await insertObject(trx, 'obj-b');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await insertChannel(trx, { channelId: 'ch-b', kind: 'object', objectId: 'obj-b' });
      await follow(trx, 'alice', 'obj-a');
      await follow(trx, 'bob', 'obj-b');
      await insertMessage(trx, { messageId: 'msg-a', channelId: 'ch-a', created: 10, seq: BigInt(1) });
      await insertMessage(trx, { messageId: 'msg-b', channelId: 'ch-b', created: 20, seq: BigInt(2) });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }), undefined, 'bob');

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    });
  });

  it('TC-019 breaks equal coalesced times by event_seq descending', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-hi', channelId: 'ch-a', created: 100, seq: BigInt(10) });
      await insertMessage(trx, { messageId: 'msg-lo', channelId: 'ch-a', created: 100, seq: BigInt(4) });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-hi', 'msg-lo']);
    });
  });

  it('TC-020 hides a message the viewer excluded from context', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertAccount(trx, 'bob');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, {
        messageId: 'msg-x',
        channelId: 'ch-a',
        author: 'bob',
        created: 10,
        seq: BigInt(1),
      });
      await trx
        .insertInto('message_context_exclusions')
        .values({
          message_id: 'msg-x',
          excluded_by: 'bob',
          excluded_at_unix: 11,
          event_seq: BigInt(2),
        })
        .execute();

      const result = await endpoint(trx).execute(
        'alice',
        body({ limit: 10, for_context: true }),
        undefined,
        'bob',
      );

      expect(result?.items.map((item) => item.message_id)).toEqual([]);
    });
  });

  it('TC-021 keeps a context-excluded message in normal history', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertAccount(trx, 'bob');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, {
        messageId: 'msg-x',
        channelId: 'ch-a',
        author: 'bob',
        created: 10,
        seq: BigInt(1),
      });
      await trx
        .insertInto('message_context_exclusions')
        .values({
          message_id: 'msg-x',
          excluded_by: 'bob',
          excluded_at_unix: 11,
          event_seq: BigInt(2),
        })
        .execute();

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }), undefined, 'bob');

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-x']);
    });
  });

  it('TC-022 applies the default page size of 50', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      for (let time = 1; time <= 51; time += 1) {
        await insertMessage(trx, {
          messageId: `msg-${time}`,
          channelId: 'ch-a',
          created: time,
          seq: BigInt(time),
        });
      }

      const result = await endpoint(trx).execute('alice', body({}));

      expect(result?.items).toHaveLength(50);
      expect(result?.items[0]?.created_at_unix).toBe(51);
      expect(result?.items[49]?.created_at_unix).toBe(2);
      expect(result?.hasMore).toBe(true);
      expect(decodeMessageCursor(result?.cursor ?? '')?.createdAtUnix).toBe(2);
    });
  });

  it('TC-023 honors limit 1', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      for (let time = 1; time <= 51; time += 1) {
        await insertMessage(trx, {
          messageId: `msg-${time}`,
          channelId: 'ch-a',
          created: time,
          seq: BigInt(time),
        });
      }

      const result = await endpoint(trx).execute('alice', body({ limit: 1 }));

      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]?.created_at_unix).toBe(51);
      expect(result?.hasMore).toBe(true);
    });
  });

  it('TC-024 honors limit 100', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      for (let time = 1; time <= 101; time += 1) {
        await insertMessage(trx, {
          messageId: `msg-${time}`,
          channelId: 'ch-a',
          created: time,
          seq: BigInt(time),
        });
      }

      const result = await endpoint(trx).execute('alice', body({ limit: 100 }));

      expect(result?.items).toHaveLength(100);
      expect(result?.items[0]?.created_at_unix).toBe(101);
      expect(result?.items[99]?.created_at_unix).toBe(2);
      expect(result?.hasMore).toBe(true);
    });
  });

  it('TC-026 returns an empty page when the cursor is older than every row', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-new', channelId: 'ch-a', created: 500, seq: BigInt(8) });

      const cursor = encodeMessageCursor({ createdAtUnix: 1, eventSeq: BigInt(0) });
      const result = await endpoint(trx).execute('alice', body({ limit: 10, cursor }));

      expect(result).toEqual({ items: [], cursor: null, hasMore: false });
    });
  });

  it('TC-027 includes follows with the bell unset', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a', false);
      await insertMessage(trx, { messageId: 'msg-a', channelId: 'ch-a', created: 10, seq: BigInt(1) });

      const result = await endpoint(trx).execute('alice', body({ limit: 10 }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-a']);
    });
  });

  it('TC-028 does not apply context exclusion without a viewer', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, {
        messageId: 'msg-x',
        channelId: 'ch-a',
        author: 'bob',
        created: 10,
        seq: BigInt(1),
      });
      await trx
        .insertInto('message_context_exclusions')
        .values({
          message_id: 'msg-x',
          excluded_by: 'bob',
          excluded_at_unix: 11,
          event_seq: BigInt(2),
        })
        .execute();

      const result = await endpoint(trx).execute('alice', body({ limit: 10, for_context: true }));

      expect(result?.items.map((item) => item.message_id)).toEqual(['msg-x']);
    });
  });

  it('TC-029 does not repeat the boundary row when coalesced times tie', async () => {
    await withRollback(db, async (trx) => {
      await insertAccount(trx, 'alice');
      await insertObject(trx, 'obj-a');
      await insertChannel(trx, { channelId: 'ch-a', kind: 'object', objectId: 'obj-a' });
      await follow(trx, 'alice', 'obj-a');
      await insertMessage(trx, { messageId: 'msg-hi', channelId: 'ch-a', created: 100, seq: BigInt(10) });
      await insertMessage(trx, { messageId: 'msg-lo', channelId: 'ch-a', created: 100, seq: BigInt(4) });
      await insertMessage(trx, { messageId: 'msg-old', channelId: 'ch-a', created: 90, seq: BigInt(1) });

      const api = endpoint(trx);
      const page1 = await api.execute('alice', body({ limit: 1 }));
      const page2 = await api.execute('alice', body({ limit: 10, cursor: page1?.cursor ?? '' }));

      expect(page1?.items.map((item) => item.message_id)).toEqual(['msg-hi']);
      expect(decodeMessageCursor(page1?.cursor ?? '')).toEqual({
        createdAtUnix: 100,
        eventSeq: BigInt(10),
      });
      expect(page2?.items[0]?.message_id).toBe('msg-lo');
      expect(page2?.items.map((item) => item.message_id)).not.toContain('msg-hi');
    });
  });
});
