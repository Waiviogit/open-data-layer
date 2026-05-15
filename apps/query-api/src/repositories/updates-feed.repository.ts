import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { ObjectUpdate, ValidityVote } from '@opden-data-layer/core';
import type { Database } from '../database';
import { KYSELY } from '../database';

const APPROVAL_SORT_MAX_ROWS = 1000;

export interface UpdatesFeedJoinRow {
  row: ObjectUpdate;
  creator_wobjects_weight: number;
  geo_lat: number | null;
  geo_lon: number | null;
}

@Injectable()
export class UpdatesFeedRepository {
  private readonly logger = new Logger(UpdatesFeedRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  /**
   * Keyset page: newest first by (created_at_unix DESC, update_id DESC).
   */
  async findRecencyPage(params: {
    objectId: string;
    updateType?: string;
    locale?: string;
    limit: number;
    cursorCreatedAt?: number;
    cursorUpdateId?: string;
  }): Promise<UpdatesFeedJoinRow[]> {
    try {
      let q = this.db
        .selectFrom('object_updates as ou')
        .leftJoin('accounts_current as ac', (join) => join.onRef('ou.creator', '=', 'ac.name'))
        .where('ou.object_id', '=', params.objectId)
        .selectAll('ou')
        .select([
          sql<number>`coalesce(ac.wobjects_weight, 0)::double precision`.as('creator_wobjects_weight'),
          sql<number | null>`case when ou.value_geo is null then null else ST_Y(ou.value_geo::geometry) end`.as(
            'geo_lat',
          ),
          sql<number | null>`case when ou.value_geo is null then null else ST_X(ou.value_geo::geometry) end`.as(
            'geo_lon',
          ),
        ])
        .orderBy('ou.created_at_unix', 'desc')
        .orderBy('ou.update_id', 'desc');

      if (params.updateType !== undefined) {
        q = q.where('ou.update_type', '=', params.updateType);
      }
      if (params.locale !== undefined) {
        q = q.where('ou.locale', '=', params.locale);
      }

      const cursorT =
        params.cursorCreatedAt !== undefined ? Number(params.cursorCreatedAt) : undefined;
      const cursorId = params.cursorUpdateId;

      if (
        cursorT !== undefined &&
        Number.isFinite(cursorT) &&
        cursorId !== undefined &&
        cursorId.length > 0
      ) {
        q = q.where((eb) =>
          eb.or([
            eb('ou.created_at_unix', '<', cursorT),
            eb.and([eb('ou.created_at_unix', '=', cursorT), eb('ou.update_id', '<', cursorId)]),
          ]),
        );
      }

      const rows = await q.limit(params.limit).execute();
      return rows.map((r) => this.toJoinRow(r));
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  /**
   * All matching rows up to {@link APPROVAL_SORT_MAX_ROWS} for in-memory approval sort.
   */
  async findAllForApprovalSort(params: {
    objectId: string;
    updateType?: string;
    locale?: string;
  }): Promise<UpdatesFeedJoinRow[]> {
    try {
      let q = this.db
        .selectFrom('object_updates as ou')
        .leftJoin('accounts_current as ac', (join) => join.onRef('ou.creator', '=', 'ac.name'))
        .where('ou.object_id', '=', params.objectId)
        .selectAll('ou')
        .select([
          sql<number>`coalesce(ac.wobjects_weight, 0)::double precision`.as('creator_wobjects_weight'),
          sql<number | null>`case when ou.value_geo is null then null else ST_Y(ou.value_geo::geometry) end`.as(
            'geo_lat',
          ),
          sql<number | null>`case when ou.value_geo is null then null else ST_X(ou.value_geo::geometry) end`.as(
            'geo_lon',
          ),
        ])
        .orderBy('ou.created_at_unix', 'desc')
        .orderBy('ou.update_id', 'desc')
        .limit(APPROVAL_SORT_MAX_ROWS);

      if (params.updateType !== undefined) {
        q = q.where('ou.update_type', '=', params.updateType);
      }
      if (params.locale !== undefined) {
        q = q.where('ou.locale', '=', params.locale);
      }

      const rows = await q.execute();
      return rows.map((r) => this.toJoinRow(r));
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async findValidityVotesForObjectAndUpdates(
    objectId: string,
    updateIds: string[],
  ): Promise<ValidityVote[]> {
    if (updateIds.length === 0) {
      return [];
    }
    try {
      return await this.db
        .selectFrom('validity_votes')
        .where('object_id', '=', objectId)
        .where('update_id', 'in', updateIds)
        .selectAll()
        .execute();
    } catch (e) {
      this.logger.error((e as Error).message);
      return [];
    }
  }

  async findWaivPowersByAccounts(accounts: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (accounts.length === 0) {
      return map;
    }
    try {
      const rows = await this.db
        .selectFrom('user_object_powers')
        .where('account', 'in', accounts)
        .select(['account', 'waiv_power'])
        .execute();
      for (const r of rows) {
        map.set(r.account, r.waiv_power);
      }
    } catch (e) {
      this.logger.error((e as Error).message);
    }
    return map;
  }

  private toJoinRow(r: Record<string, unknown>): UpdatesFeedJoinRow {
    const {
      creator_wobjects_weight: cw,
      geo_lat: gla,
      geo_lon: glo,
      ...rest
    } = r as Record<string, unknown> & {
      creator_wobjects_weight: number;
      geo_lat: number | null;
      geo_lon: number | null;
    };
    const row = rest as unknown as ObjectUpdate;
    return {
      row,
      creator_wobjects_weight: typeof cw === 'number' ? cw : Number(cw ?? 0),
      geo_lat: gla == null ? null : Number(gla),
      geo_lon: glo == null ? null : Number(glo),
    };
  }
}
