import { createTestDb, withRollback } from '@opden-data-layer/test-postgres';

import {
  insertTestChannel,
  insertTestMessage,
} from '../../test/message-fixtures';

describe('00064_messages_activity_dedup constraints', () => {
  const db = createTestDb();

  afterAll(async () => {
    await db.destroy();
  });

  it('TC-060: rejects duplicate source on the same channel', async () => {
    await withRollback(db, async (trx) => {
      await insertTestChannel(trx, 'ch-a');
      await insertTestMessage(trx, {
        message_id: 'msg-1',
        channel_id: 'ch-a',
        source_platform: 'instagram',
        source_id: 'ABC123',
      });

      await expect(
        insertTestMessage(trx, {
          message_id: 'msg-2',
          channel_id: 'ch-a',
          source_platform: 'instagram',
          source_id: 'ABC123',
        }),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  it('TC-058: allows the same source on different channels', async () => {
    await withRollback(db, async (trx) => {
      await insertTestChannel(trx, 'ch-a');
      await insertTestChannel(trx, 'ch-b');
      await insertTestMessage(trx, {
        message_id: 'msg-a',
        channel_id: 'ch-a',
        source_platform: 'instagram',
        source_id: 'ABC123',
      });

      await expect(
        insertTestMessage(trx, {
          message_id: 'msg-b',
          channel_id: 'ch-b',
          source_platform: 'instagram',
          source_id: 'ABC123',
        }),
      ).resolves.toBeUndefined();
    });
  });

  it('TC-061: rejects a half-filled source pair', async () => {
    await withRollback(db, async (trx) => {
      await insertTestChannel(trx, 'ch-a');

      await expect(
        trx
          .insertInto('messages')
          .values({
            message_id: 'msg-bad',
            channel_id: 'ch-a',
            author: 'alice',
            body: 'fixture body for migration tests',
            mentions: [],
            linked_object_ids: [],
            created_at_unix: 1_700_000_000,
            event_seq: BigInt(1),
            transaction_id: 'tx-message',
            source_platform: 'instagram',
            source_id: null,
            image_phashes: [],
            dup_group_id: 'msg-bad',
          })
          .execute(),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });
});
