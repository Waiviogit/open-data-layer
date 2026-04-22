import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Database } from '../database';
import { KYSELY } from '../database';
import type { NewSiteRegistryRow } from '@opden-data-layer/core';

@Injectable()
export class SiteRegistryRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async upsertByCreator(row: NewSiteRegistryRow): Promise<void> {
    const now = new Date();
    await this.db
      .insertInto('site_registry')
      .values({ ...row, updated_at: now })
      .onConflict((oc) =>
        oc.column('creator').doUpdateSet({
          website_raw: row.website_raw,
          website_normalized: row.website_normalized,
          effective_canonical: row.effective_canonical,
          site_state: row.site_state,
          is_reachable: row.is_reachable,
          last_checked_at: row.last_checked_at,
          last_success_at: row.last_success_at,
          last_error: row.last_error,
          consecutive_fail_count: row.consecutive_fail_count,
          http_status_code: row.http_status_code,
          updated_at: now,
        }),
      )
      .execute();
  }

  async listCreatorsForDailyCheck(
    limit: number,
    offset: number,
  ): Promise<string[]> {
    const rows = await this.db
      .selectFrom('site_registry')
      .select('creator')
      .orderBy('updated_at', 'asc')
      .limit(limit)
      .offset(offset)
      .execute();
    return rows.map((r) => r.creator);
  }

  async findByCreator(creator: string) {
    return this.db
      .selectFrom('site_registry')
      .selectAll()
      .where('creator', '=', creator)
      .executeTakeFirst();
  }
}
