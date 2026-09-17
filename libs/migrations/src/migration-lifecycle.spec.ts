import { sql } from 'kysely';
import {
  migrateDown,
  migrateTo,
  migrateToLatest,
} from '@opden-data-layer/migrations';
import {
  createTestDb,
  resolveTestPostgresUrl,
} from '@opden-data-layer/test-postgres';

import { insertTestChannel } from './test/message-fixtures';

describe('00064 migration lifecycle (TC-062)', () => {
  const db = createTestDb();
  const connectionString = resolveTestPostgresUrl();

  afterAll(async () => {
    await migrateToLatest({ connectionString });
    await db.destroy();
  });

  it('backfills dup_group_id and reverses cleanly', async () => {
    await migrateTo({ connectionString }, '00063_user_notification_settings_obl');

    await insertTestChannel(db, 'ch-lifecycle');
    await sql`
      INSERT INTO messages (
        message_id,
        channel_id,
        author,
        body,
        mentions,
        linked_object_ids,
        created_at_unix,
        event_seq,
        transaction_id
      )
      VALUES (
        'msg-pre-64',
        'ch-lifecycle',
        'alice',
        'pre migration row',
        '{}',
        '{}',
        ${1_700_000_000},
        ${BigInt(1)},
        'tx-pre'
      )
    `.execute(db);

    await migrateToLatest({ connectionString });

    const afterUp = await db
      .selectFrom('messages')
      .select(['message_id', 'dup_group_id'])
      .where('message_id', '=', 'msg-pre-64')
      .executeTakeFirstOrThrow();
    expect(afterUp.dup_group_id).toBe('msg-pre-64');

    const notNull = await sql<{ attnotnull: boolean }>`
      SELECT attnotnull
      FROM pg_attribute
      WHERE attrelid = 'messages'::regclass
        AND attname = 'dup_group_id'
        AND NOT attisdropped
    `.execute(db);
    expect(notNull.rows[0]?.attnotnull).toBe(true);

    await migrateDown({ connectionString });

    const columnNames = await sql<{ column_name: string }>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'messages'
        AND column_name IN (
          'source_platform',
          'source_id',
          'text_simhash',
          'image_phashes',
          'fingerprint_v',
          'dup_group_id'
        )
    `.execute(db);
    expect(columnNames.rows).toHaveLength(0);

    const indexNames = await sql<{ indexname: string }>`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'messages'
        AND indexname IN (
          'uq_messages_source',
          'idx_messages_dedup_window',
          'idx_messages_dup_group'
        )
    `.execute(db);
    expect(indexNames.rows).toHaveLength(0);

    await migrateToLatest({ connectionString });
  });
});
