import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import { KYSELY, type Database } from '../database';
import type { JobHandlerContext } from './cron-job.types';
import {
  computeTimeWeightedAvg,
  WAIV_POWER_HISTORY_PRUNE_DAYS,
  waivPowerAvgWindowStart,
} from './waiv-power-avg.util';

const ACCOUNT_BATCH_SIZE = 500;

let runnerRef: WaivPowerAvgRunner | null = null;

function registerWaivPowerAvgRunner(r: WaivPowerAvgRunner): void {
  runnerRef = r;
}

export function getWaivPowerAvgRunnerForJob(): WaivPowerAvgRunner {
  if (!runnerRef) {
    throw new Error('WaivPowerAvgRunner is not registered yet');
  }
  return runnerRef;
}

@Injectable()
export class WaivPowerAvgRunner implements OnModuleInit {
  private readonly logger = new Logger(WaivPowerAvgRunner.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  onModuleInit(): void {
    registerWaivPowerAvgRunner(this);
  }

  /**
   * Snapshots dirty users, recomputes 30-day rolling averages, prunes old history.
   */
  async run(ctx: JobHandlerContext): Promise<void> {
    const snapshotted = await this.snapshotDirtyUsers(ctx.signal);
    this.logger.log(`waiv-power-avg: snapshotted ${snapshotted} dirty account(s)`);
    if (ctx.signal.aborted) {
      this.logger.log('waiv-power-avg: aborted after snapshot');
      return;
    }

    const updated = await this.computeRollingAverages(ctx.signal);
    this.logger.log(`waiv-power-avg: updated ${updated} account(s)`);
    if (ctx.signal.aborted) {
      this.logger.log('waiv-power-avg: aborted after compute');
      return;
    }

    const pruned = await this.pruneHistory(ctx.signal);
    this.logger.log(`waiv-power-avg: pruned ${pruned} history row(s)`);
  }

  async snapshotDirtyUsers(signal: AbortSignal): Promise<number> {
    if (signal.aborted) {
      return 0;
    }
    const result = await sql`
      WITH dirty AS (
        UPDATE user_object_powers
        SET waiv_power_dirty = FALSE
        WHERE waiv_power_dirty = TRUE
        RETURNING account, raw_waiv_power
      )
      INSERT INTO user_waiv_power_history (account, waiv_power)
      SELECT account, raw_waiv_power FROM dirty
    `.execute(this.db);
    return Number(result.numAffectedRows ?? 0);
  }

  async computeRollingAverages(signal: AbortSignal): Promise<number> {
    const now = new Date();
    const windowStart = waivPowerAvgWindowStart(now);
    let offset = 0;
    let updated = 0;

    for (;;) {
      if (signal.aborted) {
        return updated;
      }

      const accounts = await this.db
        .selectFrom('user_waiv_power_history')
        .select('account')
        .where('recorded_at', '>=', windowStart)
        .distinct()
        .orderBy('account', 'asc')
        .limit(ACCOUNT_BATCH_SIZE)
        .offset(offset)
        .execute();

      if (accounts.length === 0) {
        return updated;
      }

      for (const { account } of accounts) {
        if (signal.aborted) {
          return updated;
        }
        const changed = await this.computeAvgForAccount(
          account,
          windowStart,
          now,
        );
        if (changed) {
          updated += 1;
        }
      }

      offset += ACCOUNT_BATCH_SIZE;
    }
  }

  private async computeAvgForAccount(
    account: string,
    windowStart: Date,
    now: Date,
  ): Promise<boolean> {
    const anchorRow = await this.db
      .selectFrom('user_waiv_power_history')
      .select(['waiv_power', 'recorded_at'])
      .where('account', '=', account)
      .where('recorded_at', '<', windowStart)
      .orderBy('recorded_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    const inWindowRows = await this.db
      .selectFrom('user_waiv_power_history')
      .select(['waiv_power', 'recorded_at'])
      .where('account', '=', account)
      .where('recorded_at', '>=', windowStart)
      .orderBy('recorded_at', 'asc')
      .execute();

    const avg = computeTimeWeightedAvg(
      anchorRow
        ? {
            waiv_power: anchorRow.waiv_power,
            recorded_at: anchorRow.recorded_at,
          }
        : null,
      inWindowRows.map((row) => ({
        waiv_power: row.waiv_power,
        recorded_at: row.recorded_at,
      })),
      windowStart,
      now,
    );

    if (avg === null) {
      return false;
    }

    await this.db
      .updateTable('user_object_powers')
      .set({ waiv_power: Math.max(0, avg) })
      .where('account', '=', account)
      .execute();

    return true;
  }

  async pruneHistory(signal: AbortSignal): Promise<number> {
    if (signal.aborted) {
      return 0;
    }
    const result = await sql`
      WITH anchors AS (
        SELECT DISTINCT ON (account) id
        FROM user_waiv_power_history
        ORDER BY account, recorded_at DESC
      )
      DELETE FROM user_waiv_power_history
      WHERE recorded_at < NOW() - (${WAIV_POWER_HISTORY_PRUNE_DAYS} * INTERVAL '1 day')
        AND id NOT IN (SELECT id FROM anchors)
    `.execute(this.db);
    return Number(result.numAffectedRows ?? 0);
  }
}
