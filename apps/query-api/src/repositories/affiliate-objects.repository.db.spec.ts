import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { migrateToLatest } from '@opden-data-layer/migrations';
import type { OdlDatabase } from '@opden-data-layer/odl-db-types';
import {
  createTestDb,
  resolveTestPostgresUrl,
  withRollback,
} from '@opden-data-layer/test-postgres';

import type { Database } from '../database';
import { AffiliateObjectsRepository } from './affiliate-objects.repository';

const describeDb = process.env.POSTGRES_TEST_URL ? describe : describe.skip;

type Trx = Kysely<OdlDatabase>;

async function insertAffiliate(
  trx: Trx,
  objectId: string,
  status: 'active' | 'unavailable' = 'active',
): Promise<void> {
  await trx
    .insertInto('objects_core')
    .values({
      object_id: objectId,
      object_type: 'affiliate',
      creator: 'alice',
      transaction_id: `tx-${objectId}`,
      status,
    })
    .execute();
}

async function insertOwnership(
  trx: Trx,
  objectId: string,
  account: string,
  ownershipType: 'exclusive' | 'supervised',
): Promise<void> {
  await trx
    .insertInto('object_ownership')
    .values({
      object_id: objectId,
      account,
      ownership_type: ownershipType,
      event_seq: BigInt(1),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    })
    .execute();
}

async function insertFavorite(trx: Trx, objectId: string, account: string): Promise<void> {
  await trx
    .insertInto('object_favorite')
    .values({
      object_id: objectId,
      account,
      event_seq: BigInt(1),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    })
    .execute();
}

async function insertAffiliateCode(
  trx: Trx,
  input: { objectId: string; updateId: string; creator: string; scope: string },
): Promise<void> {
  await trx
    .insertInto('object_updates')
    .values({
      update_id: input.updateId,
      object_id: input.objectId,
      update_type: 'affiliateCode',
      creator: input.creator,
      locale: null,
      created_at_unix: 1,
      event_seq: BigInt(1),
      transaction_id: `tx-${input.updateId}`,
      value_text: null,
      value_geo: null,
      value_json: sql`${JSON.stringify([input.scope, 'CODE'])}::jsonb`,
    })
    .execute();
}

describeDb('AffiliateObjectsRepository (db)', () => {
  const db = createTestDb();

  beforeAll(async () => {
    await migrateToLatest({ connectionString: resolveTestPostgresUrl() });
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('exclusive ownership qualifies; supervised and favorite do not', async () => {
    await withRollback(db, async (trx) => {
      await insertAffiliate(trx, 'aff-a');
      await insertAffiliate(trx, 'aff-b');
      await insertAffiliate(trx, 'aff-c');
      await insertAffiliate(trx, 'aff-d');
      await insertOwnership(trx, 'aff-a', 'auth', 'exclusive');
      await insertOwnership(trx, 'aff-b', 'auth', 'supervised');
      await insertFavorite(trx, 'aff-c', 'auth');
      await insertOwnership(trx, 'aff-d', 'other', 'exclusive');

      const repo = new AffiliateObjectsRepository(trx as unknown as Kysely<Database>);
      await expect(repo.findObjectIdsForAuthorities(['auth'])).resolves.toEqual(['aff-a']);
    });
  });

  it('PERSONAL lookup is creator + scope + active affiliate', async () => {
    await withRollback(db, async (trx) => {
      await insertAffiliate(trx, 'aff-alice');
      await insertAffiliate(trx, 'aff-alice-gov');
      await insertAffiliate(trx, 'aff-bob');
      await insertAffiliate(trx, 'aff-alice-dead', 'unavailable');
      await insertAffiliateCode(trx, {
        objectId: 'aff-alice',
        updateId: 'u-alice',
        creator: 'alice',
        scope: 'PERSONAL',
      });
      await insertAffiliateCode(trx, {
        objectId: 'aff-alice-gov',
        updateId: 'u-alice-gov',
        creator: 'alice',
        scope: 'GOVERNANCE',
      });
      await insertAffiliateCode(trx, {
        objectId: 'aff-bob',
        updateId: 'u-bob',
        creator: 'bob',
        scope: 'PERSONAL',
      });
      await insertAffiliateCode(trx, {
        objectId: 'aff-alice-dead',
        updateId: 'u-dead',
        creator: 'alice',
        scope: 'PERSONAL',
      });

      const repo = new AffiliateObjectsRepository(trx as unknown as Kysely<Database>);
      await expect(repo.findPersonalObjectIdsForCreator('alice')).resolves.toEqual(['aff-alice']);
    });
  });
});
