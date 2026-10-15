import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Kysely } from 'kysely';

import { KYSELY, type Database } from '../database';

@Injectable()
export class HiveEngineRatesRepository {
  private readonly logger = new Logger(HiveEngineRatesRepository.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  private toDateIso(lastPayout: string | null | undefined): string | null {
    const raw = (lastPayout ?? '').trim();
    if (raw === '') {
      return null;
    }
    const iso = raw.includes('Z') ? raw : `${raw}.000Z`;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) {
      return null;
    }
    return new Date(ms).toISOString().slice(0, 10);
  }

  async resolveWaivUsdRateAtDate(
    lastPayout: string | null | undefined,
  ): Promise<number> {
    try {
      const dateIso = this.toDateIso(lastPayout);
      if (dateIso) {
        const onDate = await this.db
          .selectFrom('hive_engine_rates')
          .select('rate_usd')
          .where('base', '=', 'WAIV')
          .where('is_daily', '=', true)
          .where('date', '=', dateIso as never)
          .executeTakeFirst();
        if (onDate?.rate_usd != null && onDate.rate_usd > 0) {
          return onDate.rate_usd;
        }
      }

      const latest = await this.db
        .selectFrom('hive_engine_rates')
        .select('rate_usd')
        .where('base', '=', 'WAIV')
        .where('is_daily', '=', true)
        .orderBy('date', 'desc')
        .limit(1)
        .executeTakeFirst();

      return latest?.rate_usd != null && latest.rate_usd > 0 ? latest.rate_usd : 0;
    } catch (e) {
      this.logger.error((e as Error).message);
      return 0;
    }
  }
}
