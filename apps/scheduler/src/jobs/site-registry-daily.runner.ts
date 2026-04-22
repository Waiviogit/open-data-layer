import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql, type Kysely } from 'kysely';
import type { SiteRegistryRow } from '@opden-data-layer/core';
import {
  buildFallbackCanonicalUrl,
  checkUrlHealth,
  isAllowedPublicHttpsUrl,
} from '@opden-data-layer/site-canonical';
import { KYSELY, type Database } from '../database';
import type { JobHandlerContext } from './cron-job.types';

const ANTI_FLAP_THRESHOLD = 3;

let runnerRef: SiteRegistryDailyRunner | null = null;

function registerSiteRegistryDailyRunner(r: SiteRegistryDailyRunner): void {
  runnerRef = r;
}

export function getSiteRegistryDailyRunnerForJob(): SiteRegistryDailyRunner {
  if (!runnerRef) {
    throw new Error('SiteRegistryDailyRunner is not registered yet');
  }
  return runnerRef;
}

@Injectable()
export class SiteRegistryDailyRunner implements OnModuleInit {
  private readonly logger = new Logger(SiteRegistryDailyRunner.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    registerSiteRegistryDailyRunner(this);
  }

  /**
   * Re-checks each `site_registry` row: health probe, anti-flap counter,
   * bulk `objects_core` updates on active ↔ fallback transition.
   */
  async run(ctx: JobHandlerContext): Promise<void> {
    const origin = this.config.get<string>(
      'siteCanonical.fallbackOrigin',
      'https://example.com',
    );
    new URL(origin);
    const pageSize = this.config.get<number>(
      'siteCanonical.dailyPageSize',
      100,
    );
    const limit = Math.max(1, pageSize);
    let offset = 0;
    for (;;) {
      if (ctx.signal.aborted) {
        this.logger.log('site-registry-daily: aborted');
        return;
      }
      const rows = await this.db
        .selectFrom('site_registry')
        .selectAll()
        .orderBy('updated_at', 'asc')
        .limit(limit)
        .offset(offset)
        .execute();
      if (rows.length === 0) {
        return;
      }
      for (const row of rows) {
        if (ctx.signal.aborted) {
          return;
        }
        try {
          await this.processRow(row, origin, ctx.signal);
        } catch (e) {
          this.logger.warn(
            `site-registry-daily: creator ${row.creator} — ${(e as Error).message}`,
          );
        }
      }
      offset += limit;
    }
  }

  private async processRow(
    row: SiteRegistryRow,
    fallbackOrigin: string,
    jobSignal: AbortSignal,
  ): Promise<void> {
    const now = new Date();
    const normalized = row.website_normalized?.trim();
    if (!normalized) {
      await this.onProbeFailure(
        row,
        'no_website_normalized',
        now,
        fallbackOrigin,
      );
      return;
    }
    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      await this.onProbeFailure(row, 'bad_url', now, fallbackOrigin);
      return;
    }
    const g = isAllowedPublicHttpsUrl(url);
    if (!g.ok) {
      await this.onProbeFailure(
        row,
        g.reason ?? 'ssrf',
        now,
        fallbackOrigin,
      );
      return;
    }
    const h = await checkUrlHealth(normalized, { signal: jobSignal });
    if (h.ok === true) {
      await this.onProbeSuccess(row, h.finalUrl, h.status, now);
      return;
    }
    await this.onProbeFailure(
      row,
      h.reason,
      now,
      fallbackOrigin,
      h.status,
    );
  }

  private async onProbeSuccess(
    row: SiteRegistryRow,
    finalUrl: string,
    httpStatus: number,
    now: Date,
  ): Promise<void> {
    const wasFallback = row.site_state === 'fallback';
    const urlChanged =
      row.effective_canonical === null || row.effective_canonical !== finalUrl;

    await this.db
      .updateTable('site_registry')
      .set({
        site_state: 'active',
        effective_canonical: finalUrl,
        is_reachable: true,
        last_checked_at: now,
        last_success_at: now,
        last_error: null,
        consecutive_fail_count: 0,
        http_status_code: httpStatus,
        updated_at: now,
      })
      .where('creator', '=', row.creator)
      .execute();

    if (wasFallback || urlChanged) {
      await this.bulkSetObjectCanonicals(row.creator, finalUrl);
    }
  }

  private async onProbeFailure(
    row: SiteRegistryRow,
    reason: string,
    now: Date,
    fallbackOrigin: string,
    httpStatus?: number,
  ): Promise<void> {
    const count = row.consecutive_fail_count + 1;
    const crossed = count >= ANTI_FLAP_THRESHOLD;
    const wasActive = row.site_state === 'active';

    await this.db
      .updateTable('site_registry')
      .set({
        is_reachable: false,
        last_checked_at: now,
        last_error: reason,
        consecutive_fail_count: count,
        http_status_code: httpStatus ?? null,
        updated_at: now,
        ...(crossed ? { site_state: 'fallback' as const } : {}),
      })
      .where('creator', '=', row.creator)
      .execute();

    if (crossed && wasActive) {
      await this.bulkApplyPerObjectFallback(row.creator, fallbackOrigin);
    }
  }

  private async bulkSetObjectCanonicals(
    creator: string,
    canonical: string,
  ): Promise<void> {
    const objects = await this.db
      .selectFrom('objects_core')
      .select('object_id')
      .where('canonical_creator', '=', creator)
      .execute();
    for (const { object_id } of objects) {
      await this.db
        .updateTable('objects_core')
        .set({ canonical })
        .where('object_id', '=', object_id)
        .where(
          sql<boolean>`objects_core.canonical IS DISTINCT FROM ${canonical}`,
        )
        .execute();
    }
  }

  private async bulkApplyPerObjectFallback(
    creator: string,
    fallbackOrigin: string,
  ): Promise<void> {
    const objects = await this.db
      .selectFrom('objects_core')
      .select('object_id')
      .where('canonical_creator', '=', creator)
      .execute();
    for (const { object_id } of objects) {
      const url = buildFallbackCanonicalUrl(object_id, fallbackOrigin);
      await this.db
        .updateTable('objects_core')
        .set({ canonical: url })
        .where('object_id', '=', object_id)
        .where(sql<boolean>`objects_core.canonical IS DISTINCT FROM ${url}`)
        .execute();
    }
  }
}
