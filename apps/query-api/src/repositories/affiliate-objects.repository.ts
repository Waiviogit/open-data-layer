import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AFFILIATE_CODE_SCOPE,
  OBJECT_TYPES,
  UPDATE_TYPES,
} from '@opden-data-layer/core';
import type { ObjectOwnershipType } from '@opden-data-layer/odl-db-types';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';

const EXCLUSIVE_OWNERSHIP: ObjectOwnershipType = 'exclusive';

@Injectable()
export class AffiliateObjectsRepository {
  private readonly logger = new Logger(AffiliateObjectsRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findObjectIdsForAuthorities(accounts: string[]): Promise<string[] | null> {
    if (accounts.length === 0) {
      return [];
    }
    try {
      const rows = await this.db
        .selectFrom('object_ownership as oo')
        .innerJoin('objects_core as oc', 'oc.object_id', 'oo.object_id')
        .where('oo.account', 'in', accounts)
        .where('oo.ownership_type', '=', EXCLUSIVE_OWNERSHIP)
        .where('oc.object_type', '=', OBJECT_TYPES.AFFILIATE)
        .where('oc.status', '=', 'active')
        .select('oc.object_id')
        .groupBy('oc.object_id')
        .orderBy(sql`max(oc.weight) desc nulls last`)
        .execute();
      return rows.map((r) => r.object_id);
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async findAllActiveAffiliateObjectIds(): Promise<string[] | null> {
    try {
      const rows = await this.db
        .selectFrom('objects_core as oc')
        .where('oc.object_type', '=', OBJECT_TYPES.AFFILIATE)
        .where('oc.status', '=', 'active')
        .select('oc.object_id')
        .orderBy(sql`oc.weight desc nulls last`)
        .execute();
      return rows.map((r) => r.object_id);
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }

  async findPersonalObjectIdsForCreator(account: string): Promise<string[] | null> {
    const trimmed = account.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const rows = await this.db
        .selectFrom('object_updates as ou')
        .innerJoin('objects_core as oc', 'oc.object_id', 'ou.object_id')
        .where('ou.update_type', '=', UPDATE_TYPES.AFFILIATE_CODE)
        .where('ou.creator', '=', trimmed)
        .where('oc.object_type', '=', OBJECT_TYPES.AFFILIATE)
        .where('oc.status', '=', 'active')
        .where(
          sql<boolean>`ou.value_json->>0 = ${AFFILIATE_CODE_SCOPE.PERSONAL}`,
        )
        .select('oc.object_id')
        .groupBy('oc.object_id')
        .orderBy(sql`max(oc.weight) desc nulls last`)
        .execute();
      return rows.map((r) => r.object_id);
    } catch (e) {
      this.logger.error((e as Error).message);
      return null;
    }
  }
}
