import type { Kysely } from 'kysely';
import { migrateToLatest } from '@opden-data-layer/migrations';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';
import {
  createTestDb,
  resolveTestPostgresUrl,
  withRollback,
} from '@opden-data-layer/test-postgres';

import type { Database } from '../database';
import { ThreadsRepository } from './threads.repository';

const describeDb = process.env.POSTGRES_TEST_URL ? describe : describe.skip;

type Trx = Kysely<OdlDatabase>;

function repo(trx: Trx): ThreadsRepository {
  return new ThreadsRepository(trx as unknown as Kysely<Database>);
}

async function insertThread(
  trx: Trx,
  input: { author: string; permlink: string; hashtag: string; createdUnix: number },
): Promise<void> {
  await trx
    .insertInto('threads')
    .values({
      author: input.author,
      permlink: input.permlink,
      parent_author: '',
      parent_permlink: '',
      body: 'body',
      created: null,
      replies: [],
      children: 0,
      depth: 0,
      author_reputation: null,
      deleted: false,
      tickers: [],
      mentions: [],
      hashtags: [input.hashtag],
      links: [],
      images: [],
      threadstorm: false,
      net_rshares: null,
      pending_payout_value: null,
      total_payout_value: null,
      percent_hbd: null,
      cashout_time: null,
      bulk_message: false,
      type: 'ecencythreads',
      created_unix: input.createdUnix,
      updated_at_unix: input.createdUnix,
    })
    .execute();
}

describeDb('ThreadsRepository authors allowlist', () => {
  const db = createTestDb();

  beforeAll(async () => {
    const migrated = await migrateToLatest({ connectionString: resolveTestPostgresUrl() });
    if (migrated.error) {
      throw migrated.error;
    }
  }, 60_000);

  afterAll(async () => {
    await db.destroy();
  });

  it('returns only allowlisted authors for an object thread feed', async () => {
    await withRollback(db, async (trx) => {
      await insertThread(trx, {
        author: 'alice',
        permlink: 't-alice',
        hashtag: 'waivio',
        createdUnix: 200,
      });
      await insertThread(trx, {
        author: 'bob',
        permlink: 't-bob',
        hashtag: 'waivio',
        createdUnix: 100,
      });

      const rows = await repo(trx).findObjectThreadsFeed(
        'waivio',
        [],
        null,
        'latest',
        10,
        ['alice'],
      );

      expect(rows.map((row) => row.author)).toEqual(['alice']);
    });
  });
});
