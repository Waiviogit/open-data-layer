import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { createTestDb, withRollback } from '@opden-data-layer/test-postgres';
import { down, up } from './00069_affiliate_code_drop_domain_scope';

describe('00069_affiliate_code_drop_domain_scope', () => {
  const db = createTestDb();

  afterAll(async () => {
    await db.destroy();
  });

  it('deletes domain-scoped rows and keeps scoped ones; down is a no-op', async () => {
    await withRollback(db, async (trx) => {
      await trx
        .insertInto('objects_core')
        .values({
          object_id: 'aff-1',
          object_type: 'affiliate',
          creator: 'alice',
          transaction_id: 'tx-aff-1',
          status: 'active',
        })
        .execute();

      const rows = [
        { update_id: 'u-personal', value_json: ['PERSONAL', 'P1'] },
        { update_id: 'u-gov', value_json: ['GOVERNANCE', 'G1'] },
        { update_id: 'u-domain', value_json: ['example.social.gifts', 'X'] },
        { update_id: 'u-obj', value_json: { host: 'x' } },
      ];
      for (const row of rows) {
        await trx
          .insertInto('object_updates')
          .values({
            update_id: row.update_id,
            object_id: 'aff-1',
            update_type: 'affiliateCode',
            creator: 'alice',
            locale: null,
            created_at_unix: 1,
            event_seq: BigInt(1),
            transaction_id: `tx-${row.update_id}`,
            value_text: null,
            value_geo: null,
            value_json: sql`${JSON.stringify(row.value_json)}::jsonb`,
          })
          .execute();
      }

      await trx
        .insertInto('validity_votes')
        .values({
          update_id: 'u-domain',
          object_id: 'aff-1',
          voter: 'bob',
          vote: 'for',
          event_seq: BigInt(1),
          transaction_id: 'tx-vote-domain',
        })
        .execute();

      await up(trx as unknown as Kysely<unknown>);

      const remaining = await trx
        .selectFrom('object_updates')
        .select('update_id')
        .where('object_id', '=', 'aff-1')
        .orderBy('update_id')
        .execute();
      expect(remaining.map((r) => r.update_id)).toEqual(['u-gov', 'u-personal']);

      const votes = await trx
        .selectFrom('validity_votes')
        .select('update_id')
        .where('object_id', '=', 'aff-1')
        .execute();
      expect(votes).toEqual([]);

      await down(trx as unknown as Kysely<unknown>);

      const afterDown = await trx
        .selectFrom('object_updates')
        .select('update_id')
        .where('object_id', '=', 'aff-1')
        .orderBy('update_id')
        .execute();
      expect(afterDown.map((r) => r.update_id)).toEqual(['u-gov', 'u-personal']);
    });
  });
});
