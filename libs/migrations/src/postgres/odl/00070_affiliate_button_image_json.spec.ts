import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { createTestDb, withRollback } from '@opden-data-layer/test-postgres';
import { down, up } from './00070_affiliate_button_image_json';

describe('00070_affiliate_button_image_json', () => {
  const db = createTestDb();

  afterAll(async () => {
    await db.destroy();
  });

  it('migrates trimmed text buttons to { url } and leaves other rows alone', async () => {
    await withRollback(db, async (trx) => {
      await trx
        .insertInto('objects_core')
        .values({
          object_id: 'aff-btn-1',
          object_type: 'affiliate',
          creator: 'alice',
          transaction_id: 'tx-aff-btn-1',
          status: 'active',
        })
        .execute();

      const rows: Array<{
        update_id: string;
        update_type?: string;
        value_text?: string | null;
        value_json?: unknown;
      }> = [
        { update_id: 'u-legacy', value_text: 'https://img/btn.png' },
        { update_id: 'u-trim', value_text: '  https://img/btn.png  ' },
        { update_id: 'u-empty', value_text: '' },
        { update_id: 'u-ws', value_text: '   ' },
        { update_id: 'u-keep', value_json: { cid: 'bafyKeep' } },
        { update_id: 'u-name', update_type: 'name', value_text: 'Keep me' },
      ];

      for (const row of rows) {
        await trx
          .insertInto('object_updates')
          .values({
            update_id: row.update_id,
            object_id: 'aff-btn-1',
            update_type: row.update_type ?? 'affiliateButton',
            creator: 'alice',
            locale: null,
            created_at_unix: 1,
            event_seq: BigInt(1),
            transaction_id: `tx-${row.update_id}`,
            value_text: row.value_text ?? null,
            value_geo: null,
            value_json:
              row.value_json === undefined
                ? null
                : sql`${JSON.stringify(row.value_json)}::jsonb`,
          })
          .execute();
      }

      await up(trx as unknown as Kysely<unknown>);

      const afterUp = await trx
        .selectFrom('object_updates')
        .select(['update_id', 'update_type', 'value_text', 'value_json'])
        .where('object_id', '=', 'aff-btn-1')
        .execute();
      const byId = Object.fromEntries(afterUp.map((r) => [r.update_id, r]));

      expect(byId['u-legacy']).toMatchObject({
        value_text: null,
        value_json: { url: 'https://img/btn.png' },
      });
      expect(byId['u-trim']).toMatchObject({
        value_text: null,
        value_json: { url: 'https://img/btn.png' },
      });
      expect(byId['u-empty']).toMatchObject({
        value_text: '',
        value_json: null,
      });
      expect(byId['u-ws']).toMatchObject({
        value_text: '   ',
        value_json: null,
      });
      expect(byId['u-keep']).toMatchObject({
        value_text: null,
        value_json: { cid: 'bafyKeep' },
      });
      expect(byId['u-name']).toMatchObject({
        update_type: 'name',
        value_text: 'Keep me',
        value_json: null,
      });

      await down(trx as unknown as Kysely<unknown>);

      const afterDown = await trx
        .selectFrom('object_updates')
        .select(['update_id', 'value_text', 'value_json'])
        .where('object_id', '=', 'aff-btn-1')
        .execute();
      const downById = Object.fromEntries(afterDown.map((r) => [r.update_id, r]));

      expect(downById['u-legacy']).toMatchObject({
        value_text: 'https://img/btn.png',
        value_json: null,
      });
      expect(downById['u-trim']).toMatchObject({
        value_text: 'https://img/btn.png',
        value_json: null,
      });
      expect(downById['u-keep']).toMatchObject({
        value_text: null,
        value_json: { cid: 'bafyKeep' },
      });
      expect(downById['u-name']).toMatchObject({
        value_text: 'Keep me',
        value_json: null,
      });
    });
  });
});
